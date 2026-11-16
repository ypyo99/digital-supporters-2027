// 팀 별 오늘 일정 보기

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabaseClient } from '../utils/supabase';
import {
  getSavedItem,
  getLocalDateString,
  getInitialWeekday,
  getTeacherGroup,
  getTeacherSortWeight,
  getGroupWeight,
  getShiftWeight,
  getDirectImageUrl,
  getTeacherShifts,
  getTeamTeacherNames,
  findTeacherRecord
} from '../utils/helpers';
import { Home, LucideCalendar, Clock, BookOpen, Sparkles } from './Icons';

// 문자열 내에 콤마나 슬래시로 구분된 특정 키워드가 정확히 일치하는지 검사하는 유틸리티 함수
const hasIndependentKeyword = (str, keywords) => {
  if (!str) return false;
  const tokens = str.split(/[,/]+/).map(t => t.trim());
  return tokens.some(token => keywords.includes(token));
};

const mapShiftToOfficial = (team, teacherName, originalShift) => {
  if (!originalShift || !teacherName) return originalShift;
  const officialShifts = getTeacherShifts(team, teacherName);
  if (!officialShifts || officialShifts.length === 0) return originalShift;
  if (officialShifts.includes(originalShift)) return originalShift;

  const standardDefaults = team === "3팀"
    ? ["13:00~14:00", "14:00~15:00", "15:00~16:00"]
    : ["9:30~10:30", "10:30~11:30", "11:30~12:30"];

  const idx = standardDefaults.indexOf(originalShift);
  if (idx !== -1 && officialShifts[idx]) {
    return officialShifts[idx];
  }
  return originalShift;
};

const checkIsCanceled = (status) => {
  if (!status) return false;
  const tokens = status.split(/[,/]+/).map(t => t.trim());
  const isFirstWord = tokens[0] === "취소" || tokens[0] === "종료";
  const isSecondWord = tokens.length > 1 && (tokens[1] === "취소" || tokens[1] === "종료");
  return isFirstWord || isSecondWord;
};

// 회차 배지 스타일 (대비 개선 및 범례 일치)
const getSessionBadgeStyle = (count) => {
  if (count >= 15) {
    return 'bg-amber-100 text-amber-950 border border-amber-300 font-bold';
  } else if (count >= 10) {
    return 'bg-indigo-950 text-white font-bold';
  } else if (count >= 7) {
    return 'bg-purple-100 text-purple-900 border border-purple-200 font-bold';
  } else {
    return 'bg-slate-200 text-slate-800 font-bold';
  }
};

// 핵심 교육 테마 분류 정의
const THEMES = [
  {
    name: 'AI·스마트 도구',
    keywords: ['Gemini', 'AI', 'GPT', '제미나이', '구글렌즈', '클로바', '챗지피티', '챗GPT', '인공지능', '이미지', '파파고', '번역', '음성인식', '스마트렌즈', '빅스비', '시리', '챗봇'],
    icon: '✨'
  },
  {
    name: '금융·결제',
    keywords: ['페이', '이체', '은행', '지로', '보험', '증권', '토스', '카드', '서울페이', '제로페이', '카카오페이', '삼성페이', '네이버페이', '계좌', '송금', '환전'],
    icon: '💰'
  },
  {
    name: '소통',
    keywords: ['카카오톡', '카톡', '메시지', 'SMS', '문자', '이메일', '페이스톡', '밴드', '인스타그램', '페이스북', '유선', '연락처', '전화', '단톡방', '오픈채팅'],
    icon: '💬'
  },
  {
    name: '미디어',
    keywords: ['유튜브', '유트브', '사진', '영상', '편집', '갤러리', '숏츠', '릴스', '틱톡', '키네마스터', 'VITA', '캡처', '촬영', '음악', '멜론', '라디오', '팟캐스트'],
    icon: '🎥'
  },
  {
    name: '기기·보안',
    keywords: ['와이파이', '블루투스', '화면', '소리', '벨소리', '알림', '글자', '업데이트', '비밀번호', '잠금', '보안', '용량', '배터리', '설정', '스미싱', '보이스피싱', '스팸', '바이러스', '백신'],
    icon: '⚙️'
  },
  {
    name: '교통·이동',
    keywords: ['지도', '카카오T', '카카오티', '택시', '코레일', '따릉이', 'SRT', '고속버스', '길찾기', '내비게이션', '지하철', '버스', '성공버스', '노선', '승차권', '티켓', '기차', '예매'],
    icon: '🚲'
  },
  {
    name: '쇼핑·배달',
    keywords: ['배민', '배달의민족', '요기요', '쿠팡', '당근', '당근마켓', '중고나라', '쇼핑', '마트', '장보기', '이마트', '홈플러스', 'G마켓', '11번가', '주문', '키오스크', '무인'],
    icon: '🛒'
  },
  {
    name: '행정·의료',
    keywords: ['성공버스', '정부24', '손목닥터', '9988', '홈택스', '주민등록', '증명서', '민원', '국세청', '보조금', '복지로', 'PASS', '패스', '모바일신분증', '병원', '약국', '건강', '만보기', '혈압', '진료', '똑닥', '예방'],
    icon: '🏥'
  }
];

export default function DailyScheduleApp({ initialTeam, onNavigateBack, onTeamChange }) {
  const [selectedTeam, setSelectedTeam] = useState(initialTeam || "1팀");
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'summary'

  // 수업 내용 메모 접기/펼치기 상태 관리
  const [expandedMemos, setExpandedMemos] = useState({});

  // 사용자가 버튼을 눌러 변경한 출결 상태 오버라이드 맵
  const [attendanceOverrides, setAttendanceOverrides] = useState({});

  const [currentDisplayDate, setCurrentDisplayDate] = useState(() => {
    try {
      const savedDate = window.sessionStorage.getItem('sungdong_daily_schedule_date');
      if (savedDate) {
        const parsedDate = new Date(parseInt(savedDate, 10));
        if (!isNaN(parsedDate.getTime())) return parsedDate;
      }
    } catch (e) { }

    let d = new Date();
    d.setHours(0, 0, 0, 0);
    if (d.getDay() === 6) d.setDate(d.getDate() + 2);
    else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
    return d;
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem('sungdong_daily_schedule_date', currentDisplayDate.getTime().toString());
    } catch (e) { }
  }, [currentDisplayDate]);

  const [scheduleData, setScheduleData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [holidaysDbList, setHolidaysDbList] = useState([]);
  const [selectedStudentDates, setSelectedStudentDates] = useState(null);

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const latestFetchRef = useRef(null);

  useEffect(() => {
    document.documentElement.style.overscrollBehaviorY = 'auto';
    document.body.style.overscrollBehaviorY = 'auto';
  }, []);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = touchStartY.current - touchEndY;

    if (isLoading) {
      touchStartX.current = null;
      touchStartY.current = null;
      return;
    }

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 150) {
      if (deltaX > 0) handleDateChange(1);
      else handleDateChange(-1);
    }

    touchStartX.current = null;
    touchStartY.current = null;
  };

  // 공휴일 로드
  useEffect(() => {
    const loadHolidays = async () => {
      try {
        const { data, error } = await supabaseClient.from('holidays').select('*');
        if (!error && data) {
          setHolidaysDbList(data);
        }
      } catch (e) {
        console.error("holidays fetch error", e);
      }
    };
    loadHolidays();
  }, []);

  // 주말 건너뛰기
  useEffect(() => {
    if (holidaysDbList.length > 0) {
      setCurrentDisplayDate(prev => {
        let temp = new Date(prev);
        let changed = false;
        while (temp.getDay() === 0 || temp.getDay() === 6) {
          temp.setDate(temp.getDate() + 1);
          changed = true;
        }
        return changed ? temp : prev;
      });
    }
  }, [holidaysDbList]);

  // 팀 데이터 로드
  const fetchTeamData = useCallback(async (teamName, displayDate) => {
    if (!teamName) return;

    const fetchId = Date.now().toString() + Math.random().toString();
    latestFetchRef.current = fetchId;

    setIsLoading(true);
    setScheduleData([]);
    setNotice("");
    setAttendanceOverrides({}); // 날짜/팀 변경 시 오버라이드 초기화

    try {
      const dateStr = getLocalDateString(displayDate);
      const { data: supabaseRecords, error: supabaseError } = await supabaseClient
        .from('daily_logs')
        .select('*')
        .eq('team', teamName)
        .eq('log_date', dateStr);

      if (supabaseError) throw supabaseError;

      const records = supabaseRecords || [];

      if (records.length === 0) {
        if (latestFetchRef.current !== fetchId) return;
        setScheduleData([]);
        setNotice(`⚠️ 해당 날짜(${dateStr})의 일지 데이터가 없습니다.`);
        setIsLoading(false);
        return;
      }

      const parsedData = [];
      const teamTeachers = getTeamTeacherNames(teamName).filter(teacher => {
        const tRec = findTeacherRecord(teamName, teacher);
        if (!tRec) return true;
        if (tRec.hire_date && dateStr < tRec.hire_date) return false;
        if (tRec.resign_date && dateStr > tRec.resign_date) return false;
        return true;
      });

      teamTeachers.forEach(teacher => {
        const officialShifts = getTeacherShifts(teamName, teacher) || [];
        const group = getTeacherGroup(teamName, teacher);
        officialShifts.forEach(shift => {
          parsedData.push({
            group: group,
            teacher: teacher,
            time: shift,
            student: "-",
            status: "-",
            location: "",
            sessionCounts: null,
            isSpecial: false
          });
        });
      });

      records.forEach(r => {
        const tRec = findTeacherRecord(teamName, r.teacher);
        if (tRec) {
          if (tRec.hire_date && dateStr < tRec.hire_date) return;
          if (tRec.resign_date && dateStr > tRec.resign_date) return;
        }

        const group = getTeacherGroup(teamName, r.teacher);
        const mappedTime = mapShiftToOfficial(teamName, r.teacher, r.shift);

        const existingIdx = parsedData.findIndex(p => p.teacher === r.teacher && p.time === mappedTime && p.student === "-");
        const formattedRecord = {
          group: group,
          teacher: r.teacher,
          time: mappedTime,
          student: r.student || "",
          status: r.status || "",
          location: r.location || "",
          sessionCounts: null,
          isSpecial: false
        };

        if (existingIdx !== -1) {
          parsedData[existingIdx] = formattedRecord;
        } else {
          parsedData.push(formattedRecord);
        }
      });

      // 학생별 과거 회차 계산
      const allStudents = [];
      const excludeKeywords = ["보조강사", "자체학습", "대상자발굴", "도선복지관", "소양교육", "간담회", "수업", "준비", "컴기초", "공휴일", "근로자의날", "근로자의 날", "삼일절", "3.1절", "어린이날", "현충일", "광복절", "개천절", "한글날", "석가탄신일", "부처님오신날", "성탄절", "제헌절", "추석", "설날", "신정", "대체공휴일", "지방선거일", "지방 선거일", "선거일", "안전교육", "안전교율", "직무교육"];

      parsedData.forEach(row => {
        if (!row.student || row.student.trim() === '-') return;
        const names = row.student.split(/[/,]/).map(s => s.trim().split('(')[0].trim()).filter(Boolean);
        names.forEach(name => {
          if (!excludeKeywords.some(kw => name.includes(kw))) {
            if (!allStudents.includes(name)) allStudents.push(name);
          }
        });
      });

      let allTeamRecords = [];
      if (allStudents.length > 0) {
        const orConditions = allStudents.map(name => `student.ilike.%${name}%`).join(',');
        const { data: histData, error: histError } = await supabaseClient
          .from('daily_logs')
          .select('log_date, student, status, teacher, shift')
          .neq('student', '')
          .not('student', 'is', null)
          .lte('log_date', dateStr)
          .or(orConditions)
          .order('log_date', { ascending: true });

        if (histError) throw histError;
        if (histData) {
          const getT = (s) => {
            if (!s) return 9999;
            const m = s.match(/(\d+):(\d+)/);
            return m ? parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0) : 9999;
          };
          allTeamRecords = histData.sort((a, b) => {
            const dateA = new Date(a.log_date).getTime();
            const dateB = new Date(b.log_date).getTime();
            if (dateA !== dateB) return dateA - dateB;
            return getT(a.shift) - getT(b.shift);
          });
        }
      }

      const studentDatesMap = {};
      const studentOffsetsMap = {};
      const dayStatusMap = {};

      allTeamRecords.forEach(hRow => {
        if (!hRow.student) return;
        const names = hRow.student.split(/[/,]/).map(s => s.trim().split('(')[0].trim()).filter(Boolean);
        names.forEach((name, nameIdx) => {
          let personalStatus = hRow.status || "";
          if (personalStatus.includes('/')) {
            const segments = personalStatus.split('/');
            if (segments.length > nameIdx) {
              personalStatus = segments[nameIdx].trim();
            }
          }
          const hasEndOrCancel = checkIsCanceled(personalStatus);
          const hasAttendance = hasIndependentKeyword(personalStatus, ["1", "출석"]);
          const isAttended = hasAttendance && !hasEndOrCancel;
          const isAbsentOrCanceled = (personalStatus.includes("결석") && !hasAttendance) || (personalStatus.includes("선생님휴가") && !hasAttendance) || (hasEndOrCancel && !hasAttendance);

          if (!dayStatusMap[name]) dayStatusMap[name] = {};
          const dParts = hRow.log_date.split('-');
          const dateObjTime = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10)).getTime();

          if (isAttended) {
            dayStatusMap[name][dateObjTime] = 'attended';
          } else if (isAbsentOrCanceled && dayStatusMap[name][dateObjTime] !== 'attended') {
            dayStatusMap[name][dateObjTime] = 'absent';
          }
        });
      });

      allTeamRecords.forEach(hRow => {
        if (!hRow.student) return;
        const names = hRow.student.split(/[/,]/).map(s => s.trim().split('(')[0].trim()).filter(Boolean);
        names.forEach((name, nameIdx) => {
          if (excludeKeywords.some(keyword => name.includes(keyword))) return;

          let personalStatus = hRow.status || "";
          if (personalStatus.includes('/')) {
            const segments = personalStatus.split('/');
            if (segments.length > nameIdx) {
              personalStatus = segments[nameIdx].trim();
            }
          }

          const hasEndOrCancel = checkIsCanceled(personalStatus);
          const hasAttendance = hasIndependentKeyword(personalStatus, ["1", "출석"]);
          const isAbsentOrCanceled = (personalStatus.includes("결석") && !hasAttendance) || (personalStatus.includes("선생님휴가") && !hasAttendance) || (hasEndOrCancel && !hasAttendance);
          const textToMatch = (hRow.memo || hRow.status || "");
          const memoMatches = Array.from(textToMatch.matchAll(/(\d+)\s*회차(?![가-힣a-zA-Z0-9])/g));
          const hasExplicitCount = memoMatches.length > 0;

          if (hRow.log_date === dateStr) return; // 오늘 날짜는 건너뜀

          const dParts = hRow.log_date.split('-');
          const dateObj = new Date(parseInt(dParts[0], 10), parseInt(dParts[1], 10) - 1, parseInt(dParts[2], 10));
          const dayStatus = dayStatusMap[name] && dayStatusMap[name][dateObj.getTime()];

          const isTargetTeacher = (t) => t && (t.includes("천은선") || t.includes("서승희"));
          const isTarget = isTargetTeacher(hRow.teacher);

          const isOnlyAbsent = (personalStatus.includes("결석") && !hasAttendance) && !(personalStatus.includes("선생님휴가") && !hasAttendance) && !(hasEndOrCancel && !hasAttendance);
          const isOnlyEnd = teamName === '취업팀' && personalStatus.split(/[,/]+/).map(t => t.trim()).some(t => t === '종료') && !hasAttendance;

          let isValidDay = false;
          if (isTarget) {
            isValidDay = (dayStatus === 'attended');
          } else if (teamName === '취업팀' && isOnlyAbsent) {
            isValidDay = true;
          } else if (isOnlyEnd) {
            isValidDay = true;
          } else {
            isValidDay = !isAbsentOrCanceled;
          }

          if (hasExplicitCount || isValidDay) {
            if (!studentDatesMap[name]) studentDatesMap[name] = [];
            if (studentOffsetsMap[name] === undefined) studentOffsetsMap[name] = 0;
            const hGroup = getTeacherGroup(teamName, hRow.teacher);
            const hShift = hRow.shift || "";

            let alreadyHas = false;
            if (isValidDay) {
              alreadyHas = studentDatesMap[name].some(d => {
                if (isTarget) {
                  const isSameTargetBucket = isTargetTeacher(d.teacher);
                  let isSameClassBucket = (teamName === '취업팀') ? (d.shift === hShift && d.group === hGroup) : (d.group === hGroup);
                  return d.date.getTime() === dateObj.getTime() && (isSameTargetBucket || isSameClassBucket);
                } else {
                  return (teamName === '취업팀')
                    ? (d.date.getTime() === dateObj.getTime() && d.shift === hShift && d.group === hGroup)
                    : (d.date.getTime() === dateObj.getTime() && d.group === hGroup);
                }
              });
            }

            let explicitVal = null;
            if (hasExplicitCount) {
              const matchObj = memoMatches.length > nameIdx ? memoMatches[nameIdx] : memoMatches[0];
              explicitVal = parseInt(matchObj[1], 10);
            }

            if (!alreadyHas && isValidDay) {
              const isAbsentEntry = teamName === '취업팀' && isOnlyAbsent;
              const isEndEntry = teamName === '취업팀' && personalStatus.split(/[,/]+/).map(t => t.trim()).some(t => t === '종료');
              studentDatesMap[name].push({
                date: dateObj,
                shift: hShift,
                group: hGroup,
                teacher: hRow.teacher,
                isAbsent: isAbsentEntry,
                isEnd: isEndEntry,
                explicitCount: explicitVal
              });
            } else if (hasExplicitCount) {
              const existing = studentDatesMap[name].find(d => d.date.getTime() === dateObj.getTime() && d.shift === hShift);
              if (existing) existing.explicitCount = explicitVal;
            }
          }
        });
      });

      // 회차 계산
      Object.keys(studentDatesMap).forEach(name => {
        studentDatesMap[name].sort((a, b) => {
          if (a.date.getTime() !== b.date.getTime()) return a.date.getTime() - b.date.getTime();
          const getT = (s) => {
            if (!s) return 9999;
            const m = s.match(/(\d+):(\d+)/) || s.match(/(\d+)\s*시/);
            return m ? parseInt(m[1]) * 60 + (m[2] ? parseInt(m[2]) : 0) : 9999;
          };
          return getT(a.shift) - getT(b.shift);
        });

        let runningOffset = 0;
        studentDatesMap[name].forEach((d, idx) => {
          if (d.explicitCount !== null && d.explicitCount !== undefined) {
            runningOffset = d.explicitCount - (idx + 1);
          }
          d.sessionNum = (idx + 1) + runningOffset;
        });
      });

      // 오늘 날짜 데이터와 병합하여 최종 회차 산출
      parsedData.sort((a, b) => {
        const weightA = getGroupWeight(a.group);
        const weightB = getGroupWeight(b.group);
        if (weightA !== weightB) return weightA - weightB;
        if (a.teacher !== b.teacher) {
          return getTeacherSortWeight(teamName, a.teacher) - getTeacherSortWeight(teamName, b.teacher);
        }
        return getShiftWeight(a.time) - getShiftWeight(b.time);
      });

      const todayParts = dateStr.split('-');
      const todayDateObj = new Date(parseInt(todayParts[0], 10), parseInt(todayParts[1], 10) - 1, parseInt(todayParts[2], 10));

      parsedData.forEach(row => {
        if (!row.student || row.student.trim() === '-') {
          row.sessionCounts = null;
          return;
        }

        const names = row.student.split(/[/,]/).map(s => s.trim().split('(')[0].trim()).filter(Boolean);
        const countsForThisRow = [];

        names.forEach(name => {
          if (excludeKeywords.some(keyword => name.includes(keyword))) return;
          const dates = studentDatesMap[name] || [];
          const currentCount = dates.length > 0 ? (dates[dates.length - 1].sessionNum || dates.length) + 1 : 1;
          countsForThisRow.push({
            name: name,
            count: currentCount,
            dates: [...dates]
          });
        });

        row.sessionCounts = countsForThisRow.length > 0 ? countsForThisRow : null;
      });

      if (latestFetchRef.current !== fetchId) return;
      setScheduleData(parsedData);
    } catch (error) {
      if (latestFetchRef.current !== fetchId) return;
      console.error("데이터 로드 에러:", error);
      setNotice("⚠️ 데이터를 가져오지 못했습니다.");
    } finally {
      if (latestFetchRef.current === fetchId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchTeamData(selectedTeam, currentDisplayDate);
  }, [selectedTeam, currentDisplayDate, fetchTeamData]);

  // 날짜 변경 핸들러
  const handleDateChange = (daysToAdd) => {
    setCurrentDisplayDate(prevDate => {
      let tempDate = new Date(prevDate);
      do {
        tempDate.setDate(tempDate.getDate() + daysToAdd);
      } while (tempDate.getDay() === 0 || tempDate.getDay() === 6);
      tempDate.setHours(0, 0, 0, 0);
      return tempDate;
    });
    setNotice("");
  };

  const handleToday = () => {
    let d = new Date();
    d.setHours(0, 0, 0, 0);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    setCurrentDisplayDate(d);
    setNotice("");
  };

  const handleDatePick = (e) => {
    if (!e.target.value) return;
    const parts = e.target.value.split('-');
    const selectedDate = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
    selectedDate.setHours(0, 0, 0, 0);
    setCurrentDisplayDate(selectedDate);
    setNotice("");
  };

  // 수업 내용 메모 접기/펼치기 토글
  const toggleMemo = (key) => {
    setExpandedMemos(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 학생별 출결 상태 판정
  const getRowAttendance = useCallback((row, studentName) => {
    const rowKey = `${row.teacher}_${row.time}_${studentName || row.student}`;
    if (attendanceOverrides[rowKey]) {
      return attendanceOverrides[rowKey];
    }

    const s = (row.status || "").trim();
    if (!s || s === "-") return 'unconfirmed';

    if (s.includes("선생님휴가") || (s.includes("휴가") && (!row.student || row.student.trim() === '-'))) {
      return 'vacation';
    }
    if (s.includes("결석") || checkIsCanceled(s)) {
      return 'absent';
    }
    if (hasIndependentKeyword(s, ["1", "출석"]) || /^[1-9]\d*/.test(s) || s.length > 2) {
      return 'attended';
    }
    return 'unconfirmed';
  }, [attendanceOverrides]);

  // 출결 상태 토글 (확인 전 -> 출석 -> 결석 -> 확인 전)
  const handleToggleAttendance = (row, studentName) => {
    const rowKey = `${row.teacher}_${row.time}_${studentName || row.student}`;
    const current = getRowAttendance(row, studentName);
    let next = 'attended';
    if (current === 'unconfirmed') next = 'attended';
    else if (current === 'attended') next = 'absent';
    else if (current === 'absent') next = 'unconfirmed';
    else if (current === 'vacation') next = 'attended';

    setAttendanceOverrides(prev => ({
      ...prev,
      [rowKey]: next
    }));
  };

  // 통계 계산
  const stats = useMemo(() => {
    let totalStudents = 0;
    let attendedCount = 0;
    let absentCount = 0;
    let vacationCount = 0;
    let unconfirmedCount = 0;
    const absentDetails = [];
    const vacationDetails = [];

    scheduleData.forEach(row => {
      const studentStr = (row.student || "").trim();
      if (!studentStr || studentStr === "-" || studentStr.includes("자체학습") || studentStr.includes("대상자발굴")) return;

      const names = studentStr.split(/[/,]/).map(s => s.trim()).filter(Boolean);
      names.forEach(name => {
        totalStudents++;
        const att = getRowAttendance(row, name);
        if (att === 'attended') {
          attendedCount++;
        } else if (att === 'absent') {
          absentCount++;
          absentDetails.push({ teacher: row.teacher, student: name, status: row.status });
        } else if (att === 'vacation') {
          vacationCount++;
          vacationDetails.push({ teacher: row.teacher, student: name, status: row.status });
        } else {
          unconfirmedCount++;
        }
      });
    });

    const checkedCount = attendedCount + absentCount + vacationCount;
    const currentPercent = totalStudents > 0 ? Math.round((checkedCount / totalStudents) * 100) : 0;
    const finalRate = (attendedCount + absentCount) > 0 ? Math.round((attendedCount / (attendedCount + absentCount)) * 100) : (totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100) : 0);

    return {
      totalStudents,
      attendedCount,
      absentCount,
      vacationCount,
      unconfirmedCount,
      checkedCount,
      currentPercent,
      finalRate,
      absentDetails,
      vacationDetails
    };
  }, [scheduleData, getRowAttendance]);

  // 교육 내용 메모 기반 주제 카테고리화
  const categorizedThemes = useMemo(() => {
    const contents = scheduleData
      .filter(row => row.status && row.status.length > 2 && !/^\d+$/.test(row.status) && !row.status.includes("복지관으로 이동"))
      .map(row => ({
        teacher: row.teacher,
        content: row.status,
        student: row.student
      }));

    const matchedThemes = THEMES.map(theme => {
      const matched = contents.filter(c => theme.keywords.some(k => c.content.toLowerCase().includes(k.toLowerCase())));
      return { ...theme, count: matched.length, items: matched };
    }).filter(t => t.count > 0);

    const categorizedCount = matchedThemes.reduce((acc, t) => acc + t.count, 0);
    const uncategorizedCount = Math.max(0, contents.length - categorizedCount);

    return {
      themes: matchedThemes,
      uncategorizedCount: uncategorizedCount,
      totalMemos: contents.length
    };
  }, [scheduleData]);

  // 근거 중심의 신뢰할 수 있는 사실 문장 3개 생성
  const factualInsights = useMemo(() => {
    const { totalStudents, attendedCount, absentCount, vacationCount, unconfirmedCount, checkedCount, finalRate } = stats;

    // 1. 출결 체크 현황
    let sentence1 = '';
    if (totalStudents === 0) {
      sentence1 = '오늘 배정된 수업 일정이 없습니다.';
    } else if (unconfirmedCount > 0) {
      sentence1 = `수업 ${totalStudents}건 중 출석 확인은 ${checkedCount}건이에요. 아직 ${unconfirmedCount}건이 남아 있어서 출석률은 집계 중입니다.`;
    } else {
      sentence1 = `수업 ${totalStudents}건 모두 출결 확인이 완료되었으며, 출석률은 ${finalRate}%(${attendedCount}건 출석)입니다.`;
    }

    // 2. 결석 · 휴가 사유
    let sentence2 = '';
    if (absentCount === 0 && vacationCount === 0) {
      sentence2 = '오늘 결석 및 휴가자 없이 모든 수업 일정이 순조롭게 진행되었습니다.';
    } else {
      const parts = [];
      if (absentCount > 0) {
        parts.push(`결석 ${absentCount}건은 개인 사정`);
      }
      if (vacationCount > 0) {
        const vacTeachers = Array.from(new Set(stats.vacationDetails.map(d => d.teacher))).filter(Boolean);
        const vacTeacherStr = vacTeachers.length > 0 ? `${vacTeachers.join(', ')} 선생님` : '';
        parts.push(`휴가 ${vacationCount}건은 ${vacTeacherStr} 조 수업`);
      }
      sentence2 = `${parts.join('이고, ')}이에요.`;
    }

    // 3. 수업 내용 메모 기반 주제
    let sentence3 = '';
    const sorted = [...categorizedThemes.themes].sort((a, b) => b.count - a.count);
    if (sorted.length > 0) {
      const top1 = sorted[0];
      const top2 = sorted[1];

      let topicNames = '';
      if (top2 && top2.count === top1.count) {
        topicNames = `${top1.name}와 ${top2.name}(각 ${top1.count}건)`;
      } else if (top2) {
        topicNames = `${top1.name}(${top1.count}건)과 ${top2.name}(${top2.count}건)`;
      } else {
        topicNames = `${top1.name}(${top1.count}건)`;
      }

      // 구체적 실습 키워드 발췌
      const foundKeywords = [];
      sorted.slice(0, 2).forEach(t => {
        t.items.forEach(item => {
          t.keywords.forEach(kw => {
            if (item.content.toLowerCase().includes(kw.toLowerCase()) && !foundKeywords.includes(kw)) {
              foundKeywords.push(kw);
            }
          });
        });
      });

      const sampleText = foundKeywords.length > 0
        ? `${foundKeywords.slice(0, 3).join('와 ')} 활용이`
        : '맞춤형 실습이';

      sentence3 = `가장 많이 다룬 주제는 ${topicNames}이에요. ${sampleText} 실습에 나왔습니다.`;
    } else {
      sentence3 = '등록된 상세 수업 내용 메모가 없어 교육 주제를 분석 중입니다.';
    }

    return [
      { text: sentence1, evidence: '근거: 출결 체크 현황' },
      { text: sentence2, evidence: '근거: 결석 · 휴가 표시' },
      { text: sentence3, evidence: '근거: 수업 내용 메모' },
    ];
  }, [stats, categorizedThemes]);

  // 조별 -> 선생님별 그룹화
  const groupedByGroup = useMemo(() => {
    const groups = {};
    scheduleData.forEach(row => {
      const grp = row.group || '기타';
      if (!groups[grp]) groups[grp] = {};
      const t = row.teacher || '기타';
      if (!groups[grp][t]) groups[grp][t] = [];
      groups[grp][t].push(row);
    });

    const sortedGroupKeys = Object.keys(groups).sort((a, b) => getGroupWeight(a) - getGroupWeight(b));

    return sortedGroupKeys.map(grpKey => {
      const teachersMap = groups[grpKey];
      const sortedTeacherKeys = Object.keys(teachersMap).sort((a, b) => getTeacherSortWeight(selectedTeam, a) - getTeacherSortWeight(selectedTeam, b));

      return {
        groupName: grpKey,
        teachers: sortedTeacherKeys.map(tKey => ({
          teacherName: tKey,
          shifts: teachersMap[tKey].sort((a, b) => getShiftWeight(a.time) - getShiftWeight(b.time))
        }))
      };
    });
  }, [scheduleData, selectedTeam]);

  // 날짜 문자열 포맷
  const y = currentDisplayDate.getFullYear();
  const m = String(currentDisplayDate.getMonth() + 1).padStart(2, '0');
  const d = String(currentDisplayDate.getDate()).padStart(2, '0');
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const day = dayNames[currentDisplayDate.getDay()];
  const datePickerValue = `${y}-${m}-${d}`;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#f4f6f9] dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-100 overflow-y-auto">
      {/* 1. 상단 메인 헤더 (원본 헤더 유지) */}
      <div className="shrink-0 app-header text-white z-40 relative">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5 pt-safe-4 flex justify-between items-center">
          <div>
            <div className="flex items-center mb-0.5 sm:mb-1">
              <img src="/Logo_of_Seoul.jpg" alt="서울시 로고" className="h-5 sm:h-7 hdr-logo object-contain mr-1.5 sm:mr-2" onError={(e) => e.target.style.display = 'none'} />
              <h1 className="font-black text-lg sm:text-xl md:text-2xl leading-tight">성동노인종합복지관</h1>
            </div>
            <p className="text-xs sm:text-base md:text-lg font-semibold text-blue-100">디지털교육 서포터즈</p>
          </div>
          <button onClick={onNavigateBack} className="text-xs flex flex-col items-center font-bold px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg shadow-md transition-all touch-manipulation hdr-btn shrink-0">
            <Home className="w-4 h-4 sm:w-5 sm:h-5 mb-0.5" /> 처음으로
          </button>
        </div>
      </div>

      {/* 2. 본문 컨테이너 */}
      <div
        className="flex-1 flex flex-col pb-10 px-3 sm:px-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="max-w-xl w-full mx-auto flex flex-col pt-3 sm:pt-4">
          
          {/* 날짜 선택 바 */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 w-full mb-2">
            <button
              onClick={() => handleDateChange(-1)}
              title="이전 날짜"
              className="w-10 sm:w-11 h-10 sm:h-11 flex items-center justify-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 shrink-0 transition-all touch-manipulation"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
              </svg>
            </button>

            <div className="flex-1 h-10 sm:h-11 relative flex items-center justify-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-center shadow-sm">
              <input
                type="date"
                value={datePickerValue}
                onChange={handleDatePick}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                title="달력 열기"
              />
              <span className="font-extrabold text-slate-800 dark:text-slate-100 text-[16px] sm:text-[18px] tracking-tight whitespace-nowrap">
                {currentDisplayDate.getMonth() + 1}/{currentDisplayDate.getDate()} ({day})
              </span>
            </div>

            <button
              onClick={() => handleDateChange(1)}
              title="다음 날짜"
              className="w-10 sm:w-11 h-10 sm:h-11 flex items-center justify-center border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 shrink-0 transition-all touch-manipulation"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
              </svg>
            </button>

            <button
              onClick={handleToday}
              className="h-10 sm:h-11 px-3.5 sm:px-4 border border-blue-600 rounded-xl font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 active:scale-95 text-[14.5px] sm:text-[15.5px] shrink-0 transition-all shadow-sm touch-manipulation whitespace-nowrap"
            >
              오늘
            </button>
          </div>

          {/* 팀 선택 필 (1팀 / 2팀 / 3팀 / 취업팀) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full mb-2.5">
            {["1팀", "2팀", "3팀", "취업팀"].map(team => (
              <button
                key={team}
                onClick={() => {
                  setSelectedTeam(team);
                  if (onTeamChange) onTeamChange(team);
                }}
                className={`py-2 text-[15px] sm:text-[16px] font-bold rounded-xl border text-center transition-all touch-manipulation ${
                  selectedTeam === team
                    ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {team}
              </button>
            ))}
          </div>

          {/* 일정 / 요약 탭 스위처 */}
          <div className="bg-slate-200/80 dark:bg-slate-800 p-1 rounded-2xl flex items-center w-full mb-3 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className={`flex-1 py-2 sm:py-2.5 text-[15.5px] sm:text-[16.5px] font-bold rounded-xl transition-all touch-manipulation text-center ${
                activeTab === 'schedule'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              일정
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-2 sm:py-2.5 text-[15.5px] sm:text-[16.5px] font-bold rounded-xl transition-all touch-manipulation text-center ${
                activeTab === 'summary'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              요약
            </button>
          </div>

          {/* 로딩 및 안내 메시지 */}
          <div className="text-center min-h-[16px] mb-2 flex items-center justify-center">
            {isLoading ? (
              <div className="flex items-center justify-center text-blue-600 font-bold text-sm animate-pulse tracking-tight">
                <Clock className="w-4 h-4 mr-1.5 animate-spin" />
                최신 데이터 확인 중...
              </div>
            ) : notice ? (
              <span className="text-red-500 text-sm font-bold">{notice}</span>
            ) : null}
          </div>

          {/* 공휴일 안내 배너 (있는 경우) */}
          {(() => {
            const _y = currentDisplayDate.getFullYear();
            const _m = String(currentDisplayDate.getMonth() + 1).padStart(2, '0');
            const _d = String(currentDisplayDate.getDate()).padStart(2, '0');
            const _currentDateStr = `${_y}-${_m}-${_d}`;
            const _currentDateStrShort = `${_m}-${_d}`;
            const currentHoliday = holidaysDbList.find(h => h.date === _currentDateStr || h.date === _currentDateStrShort || (h.date && h.date.endsWith(_currentDateStrShort)));

            if (currentHoliday && !currentHoliday.vacation_available) {
              return (
                <div className="bg-red-50 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-2xl p-4 sm:p-5 text-center shadow-sm mb-4 animate-fadeIn">
                  <h3 className="text-lg sm:text-xl font-black text-red-700 dark:text-red-400 mb-1">
                    {currentHoliday.name}
                  </h3>
                  {currentHoliday.content1 && (
                    <p className="text-sm sm:text-base font-bold text-red-600 dark:text-red-300">
                      {currentHoliday.content1}
                    </p>
                  )}
                </div>
              );
            }
            return null;
          })()}

          {/* ============================================================== */}
          {/* TAB 1: 일정 탭                                                 */}
          {/* ============================================================== */}
          {activeTab === 'schedule' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* 1. 출석 확인 카드 & 진행 막대 */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-4.5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-[17px] text-slate-800 dark:text-slate-100 tracking-tight">
                    출석 확인
                  </span>
                  <span className="font-extrabold text-[17px] text-slate-800 dark:text-slate-100">
                    {stats.checkedCount} / {stats.totalStudents}명
                  </span>
                </div>

                {/* 진행 막대 */}
                <div className="w-full bg-slate-100 dark:bg-slate-700 h-3 rounded-full overflow-hidden mb-3.5">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${stats.currentPercent}%` }}
                  />
                </div>

                {/* 4개 출결 상태 통계 박스 */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center mb-2.5">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl py-2 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-black text-emerald-800 dark:text-emerald-400 leading-tight">
                      {stats.attendedCount}
                    </span>
                    <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">
                      출석
                    </span>
                  </div>

                  <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl py-2 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-black text-rose-800 dark:text-rose-400 leading-tight">
                      {stats.absentCount}
                    </span>
                    <span className="text-[12px] font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                      결석
                    </span>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl py-2 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-black text-amber-800 dark:text-amber-400 leading-tight">
                      {stats.vacationCount}
                    </span>
                    <span className="text-[12px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">
                      휴가
                    </span>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-700 rounded-xl py-2 flex flex-col items-center justify-center">
                    <span className="text-[20px] font-black text-slate-800 dark:text-slate-200 leading-tight">
                      {stats.unconfirmedCount}
                    </span>
                    <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300 mt-0.5">
                      확인 전
                    </span>
                  </div>
                </div>

                <p className="text-[12.5px] sm:text-[13px] font-medium text-slate-500 dark:text-slate-400 text-center tracking-tight">
                  오른쪽 버튼을 누르면 확인 전 → 출석 → 결석 순으로 바뀌어요.
                </p>
              </div>

              {/* 2. 회차 색상 범례 (대비 개선) */}
              <div className="flex items-center gap-1.5 sm:gap-2 px-1 flex-wrap text-xs sm:text-sm">
                <span className="font-bold text-slate-600 dark:text-slate-400 mr-1 text-[13px]">회차 색상</span>
                <span className="px-2 py-0.5 rounded-md text-[12px] font-extrabold bg-slate-200 text-slate-800 border border-slate-300 shadow-2xs">
                  1–6
                </span>
                <span className="px-2 py-0.5 rounded-md text-[12px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">
                  7–9
                </span>
                <span className="px-2 py-0.5 rounded-md text-[12px] font-extrabold bg-indigo-950 text-white shadow-2xs">
                  10–14
                </span>
                <span className="px-2 py-0.5 rounded-md text-[12px] font-extrabold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                  15 이상
                </span>
              </div>

              {/* 3. 조별 & 선생님별 카드 목록 */}
              {groupedByGroup.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center text-slate-500 font-medium">
                  일정 데이터가 없습니다.
                </div>
              ) : (
                groupedByGroup.map(grp => (
                  <div key={grp.groupName} className="space-y-3">
                    {/* 조 배지 */}
                    <div className="pt-2">
                      <span className="bg-blue-600 text-white font-black text-[14px] px-3 py-1 rounded-full shadow-sm">
                        {grp.groupName}
                      </span>
                    </div>

                    {/* 조에 속한 선생님별 카드 */}
                    {grp.teachers.map(teacher => {
                      return (
                        <div
                          key={teacher.teacherName}
                          className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                        >
                          {/* 선생님 카드 헤더 */}
                          <div className="bg-blue-600 text-white px-4 py-2.5 font-black text-[17px] sm:text-[18px] tracking-tight">
                            {teacher.teacherName} 선생님
                          </div>

                          {/* 시간대별 수업 목록 */}
                          <div className="divide-y divide-slate-100 dark:divide-slate-700/60">
                            {teacher.shifts.map((row, idx) => {
                              const startTime = typeof row.time === 'string'
                                ? row.time.split('~')[0].trim()
                                : row.time;

                              const studentStr = (row.student || "").trim();
                              const isUnassigned = !studentStr || studentStr === '-';
                              const names = isUnassigned ? [] : studentStr.split(/[/,]/).map(s => s.trim().split('(')[0].trim()).filter(Boolean);

                              const rowKey = `${row.teacher}_${row.time}`;
                              const isExpanded = !!expandedMemos[rowKey];

                              // 메모 내용 추출 (상태 텍스트 중 실제 교육 내용)
                              const rawStatus = (row.status || "").trim();
                              const hasMemo = rawStatus && rawStatus !== '-' && rawStatus !== '출석' && rawStatus !== '1' && rawStatus.length > 2;

                              return (
                                <div
                                  key={idx}
                                  className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                                    !isUnassigned && getRowAttendance(row, names[0]) === 'attended'
                                      ? 'border-l-4 border-l-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10'
                                      : ''
                                  }`}
                                >
                                  {/* 좌측: 시간대 & 학생 정보 */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3">
                                      {/* 시간대 */}
                                      <span className="font-extrabold text-slate-700 dark:text-slate-300 text-[15.5px] sm:text-[16.5px] w-12 shrink-0">
                                        {startTime}
                                      </span>

                                      {/* 학생 이름 & 회차 */}
                                      {isUnassigned ? (
                                        <span className="text-slate-400 dark:text-slate-500 font-semibold text-[15.5px]">
                                          배정 없음
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-black text-slate-900 dark:text-slate-100 text-[17px] sm:text-[18px] tracking-tight">
                                            {studentStr}
                                          </span>

                                          {/* 회차 배지 */}
                                          {row.sessionCounts && row.sessionCounts.map((sc, scIdx) => (
                                            <button
                                              key={scIdx}
                                              type="button"
                                              onClick={() => setSelectedStudentDates(sc)}
                                              title="출석 일자 보기"
                                              className={`px-2 py-0.5 rounded-md text-[13px] tracking-tight shadow-2xs hover:brightness-95 active:scale-95 transition-all touch-manipulation ${getSessionBadgeStyle(sc.count)}`}
                                            >
                                              {sc.count}회차
                                            </button>
                                          ))}

                                          {/* 장소 표시 (있을 경우) */}
                                          {row.location && row.location !== '-' && row.location !== '복지관' && !row.location.startsWith('http') && (
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                              ({row.location})
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* 긴 수업 메모: 접기/펼치기 */}
                                    {!isUnassigned && hasMemo && (
                                      <div className="mt-1.5 pl-15">
                                        <button
                                          type="button"
                                          onClick={() => toggleMemo(rowKey)}
                                          className="inline-flex items-center gap-1 text-[13.5px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors py-0.5 touch-manipulation"
                                        >
                                          {isExpanded ? '수업 내용 접기 ▴' : '수업 내용 보기 ▾'}
                                        </button>
                                        {isExpanded && (
                                          <div className="mt-1.5 p-2.5 rounded-xl bg-blue-50/80 dark:bg-slate-700/60 border border-blue-100 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-[14.5px] leading-relaxed break-keep animate-fadeIn">
                                            {rawStatus}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {/* 취업팀 서명 이미지 (있을 경우) */}
                                    {row.location && (row.location.startsWith('http') || row.location.startsWith('data:')) && (
                                      <div className="mt-2 pl-15">
                                        <img
                                          src={getDirectImageUrl(row.location)}
                                          alt="서명"
                                          className="h-12 w-auto object-contain rounded border border-slate-200 bg-white p-0.5"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* 우측: 출결 상태 토글 버튼 (44px 이상) */}
                                  {!isUnassigned && (
                                    <div className="shrink-0">
                                      {(() => {
                                        const att = getRowAttendance(row, names[0]);
                                        let btnClass = '';
                                        let btnLabel = '';

                                        if (att === 'attended') {
                                          btnClass = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
                                          btnLabel = '✓ 출석';
                                        } else if (att === 'absent') {
                                          btnClass = 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700';
                                          btnLabel = '결석';
                                        } else if (att === 'vacation') {
                                          btnClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
                                          btnLabel = '휴가';
                                        } else {
                                          btnClass = 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600';
                                          btnLabel = '확인 전';
                                        }

                                        return (
                                          <button
                                            type="button"
                                            onClick={() => handleToggleAttendance(row, names[0])}
                                            className={`min-h-[44px] min-w-[82px] px-3.5 py-2 text-[15px] sm:text-[16px] font-bold rounded-xl shadow-2xs transition-all active:scale-95 touch-manipulation flex items-center justify-center ${btnClass}`}
                                          >
                                            {btnLabel}
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ============================================================== */}
          {/* TAB 2: 요약 탭                                                 */}
          {/* ============================================================== */}
          {activeTab === 'summary' && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* 1. 2x2 통계 카드 */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {/* 오늘 수업 */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-center shadow-sm flex flex-col items-center justify-center min-h-[96px]">
                  <span className="text-[24px] sm:text-[28px] font-black text-slate-900 dark:text-slate-100 leading-tight">
                    {stats.totalStudents}명
                  </span>
                  <span className="text-[13.5px] sm:text-[14.5px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    오늘 수업
                  </span>
                </div>

                {/* 출석 */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-center shadow-sm flex flex-col items-center justify-center min-h-[96px]">
                  <span className="text-[24px] sm:text-[28px] font-black text-slate-900 dark:text-slate-100 leading-tight">
                    {stats.attendedCount}명
                  </span>
                  <span className="text-[13.5px] sm:text-[14.5px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    출석
                  </span>
                </div>

                {/* 결석 · 휴가 */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-center shadow-sm flex flex-col items-center justify-center min-h-[96px]">
                  <span className="text-[24px] sm:text-[28px] font-black text-slate-900 dark:text-slate-100 leading-tight">
                    {stats.absentCount} · {stats.vacationCount}
                  </span>
                  <span className="text-[13.5px] sm:text-[14.5px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                    결석 · 휴가
                  </span>
                </div>

                {/* 출석률 / 집계 중 */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 sm:p-5 text-center shadow-sm flex flex-col items-center justify-center min-h-[96px]">
                  {stats.unconfirmedCount > 0 ? (
                    <>
                      <span className="text-[22px] sm:text-[26px] font-black text-slate-800 dark:text-slate-100 leading-tight">
                        집계 중
                      </span>
                      <span className="text-[12.5px] sm:text-[13.5px] font-bold text-slate-500 dark:text-slate-400 mt-1">
                        확인 {stats.checkedCount}/{stats.totalStudents}명 (지금 {stats.currentPercent}%)
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[24px] sm:text-[28px] font-black text-blue-600 dark:text-blue-400 leading-tight">
                        {stats.finalRate}%
                      </span>
                      <span className="text-[12.5px] sm:text-[13.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                        확인 완료 ({stats.attendedCount}/{stats.totalStudents}명)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* 2. 오늘 다룬 주제 필 */}
              <div className="pt-2">
                <h3 className="font-extrabold text-[18px] sm:text-[19px] text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
                  오늘 다룬 주제
                </h3>
                <div className="flex flex-wrap gap-2">
                  {categorizedThemes.themes.map((t, idx) => (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-full font-bold text-[14.5px] sm:text-[15.5px] text-slate-800 dark:text-slate-200 shadow-sm inline-flex items-center"
                    >
                      <span>{t.name}</span>
                      <span className="text-blue-600 dark:text-blue-400 font-extrabold ml-1.5">
                        {t.count}건
                      </span>
                    </div>
                  ))}

                  {categorizedThemes.uncategorizedCount > 0 && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-1.5 rounded-full font-bold text-[14.5px] sm:text-[15.5px] text-slate-800 dark:text-slate-200 shadow-sm inline-flex items-center">
                      <span>기타 실습</span>
                      <span className="text-blue-600 dark:text-blue-400 font-extrabold ml-1.5">
                        {categorizedThemes.uncategorizedCount}건
                      </span>
                    </div>
                  )}

                  {categorizedThemes.themes.length === 0 && categorizedThemes.uncategorizedCount === 0 && (
                    <div className="text-slate-500 dark:text-slate-400 text-sm font-medium py-2">
                      등록된 수업 내용 메모가 없습니다.
                    </div>
                  )}
                </div>
              </div>

              {/* 3. 오늘의 인사이트 (사실 근거 문장 3개) */}
              <div className="pt-2">
                <h3 className="font-extrabold text-[18px] sm:text-[19px] text-slate-900 dark:text-slate-100 mb-3 tracking-tight">
                  오늘의 인사이트
                </h3>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4.5 sm:p-5 shadow-sm divide-y divide-slate-100 dark:divide-slate-700/60">
                  {factualInsights.map((insight, idx) => (
                    <div key={idx} className={`${idx > 0 ? 'pt-3.5' : ''} ${idx < factualInsights.length - 1 ? 'pb-3.5' : ''}`}>
                      <p className="text-[15.5px] sm:text-[16.5px] font-semibold text-slate-800 dark:text-slate-100 leading-relaxed break-keep mb-1">
                        {insight.text}
                      </p>
                      <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">
                        {insight.evidence}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* 3. 학생별 과거 출석 일자 팝업 모달 */}
      {selectedStudentDates && (
        <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-[3px] flex items-center justify-center z-[60] p-3 sm:p-4" onClick={() => setSelectedStudentDates(null)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh] animate-fadeIn" onClick={e => e.stopPropagation()}>
            <div className="bg-purple-600 text-white py-3 px-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-[18px] sm:text-[20px]">
                {selectedStudentDates.name}님의 출석 일자 <span className="text-purple-200 text-[15px] sm:text-[16px]">({selectedStudentDates.count}회)</span>
              </h3>
              <button onClick={() => setSelectedStudentDates(null)} className="text-white hover:text-gray-200 active:scale-90 transition-transform p-1">
                <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="p-3 sm:p-4 overflow-y-auto">
              <div className="grid grid-cols-4 gap-2 sm:gap-3">
                {selectedStudentDates.dates.map((d, idx) => {
                  const today = new Date();
                  const isToday = d.date.getFullYear() === today.getFullYear() && d.date.getMonth() === today.getMonth() && d.date.getDate() === today.getDate();
                  const isAbsentDay = !!d.isAbsent;
                  const isEndDay = !!d.isEnd;
                  let cellClass = '';
                  if (isEndDay) {
                    cellClass = 'bg-gray-400 border-gray-500 shadow-md text-white';
                  } else if (isAbsentDay) {
                    cellClass = 'bg-orange-400 border-orange-500 shadow-md text-white';
                  } else if (isToday) {
                    cellClass = 'bg-purple-300 border-purple-500 shadow-md text-purple-950';
                  } else {
                    cellClass = 'bg-purple-50 border-purple-200 shadow-sm text-purple-900';
                  }
                  return (
                    <div key={idx} className={`${cellClass} border rounded-lg py-2 sm:py-2.5 px-0.5 sm:px-1 text-center text-[13.5px] min-[360px]:text-[15.5px] sm:text-[18px] font-bold flex justify-center items-center whitespace-nowrap tracking-tighter sm:tracking-normal relative`}>
                      <span className={`absolute top-0.5 left-1 text-[11px] sm:text-[13px] font-black leading-none opacity-90 flex items-center gap-0.5`}>
                        {d.sessionNum !== undefined ? d.sessionNum : (idx + 1)}
                        {(isAbsentDay || isEndDay) && (
                          <span className="text-[9px] sm:text-[10px] font-bold opacity-90 ml-0.5">
                            {isEndDay ? '종료' : '결석'}
                          </span>
                        )}
                      </span>
                      {d.date.getMonth() + 1}/{d.date.getDate()} ({['일', '월', '화', '수', '목', '금', '토'][d.date.getDay()]})
                    </div>
                  );
                })}
              </div>
              {selectedStudentDates.dates.length === 0 && (
                <div className="text-center text-gray-500 py-4 font-bold text-[16px] sm:text-[18px]">출석 기록이 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
