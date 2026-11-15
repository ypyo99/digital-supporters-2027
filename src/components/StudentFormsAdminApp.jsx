// ==============================================================
// 담당복지사용 참여자 서류 관리 및 일괄 인쇄 (신청서·사전/사후설문지)
// ==============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseClient } from '../utils/supabase';
import {
  getSavedItem,
  setSavedItem,
  formatTeacherRow,
  setGlobalTeachersList,
  getTeacherSortWeight
} from '../utils/helpers';
import {
  Home,
  RefreshCw,
  DownloadIcon,
  ChevronLeft,
  UsersIcon
} from './Icons';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  renderApplicationFormHtml,
  renderSurveyFormHtml,
  executeBatchPrint
} from '../utils/formPrintTemplates';

// 초성 검색 헬퍼
function getSearchChoSung(name) {
  if (!name) return "";
  return name.split('').map(char => {
    const charCode = char.charCodeAt(0);
    if (charCode < 0xAC00 || charCode > 0xD7A3) return char;
    const choIndex = Math.floor(((charCode - 0xAC00) / 28) / 21);
    const choList = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
    return choList[choIndex] || char;
  }).join('');
}

export default function StudentFormsAdminApp({ onNavigateBack }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [students, setStudents] = useState([]);
  const [applicationsMap, setApplicationsMap] = useState(new Map());
  const [preSurveysMap, setPreSurveysMap] = useState(new Map());
  const [postSurveysMap, setPostSurveysMap] = useState(new Map());

  // Filter States: Team & Teacher
  const [teamFilter, setTeamFilter] = useState("전체");
  const [teacherFilter, setTeacherFilter] = useState("전체");
  const [dbTeachers, setDbTeachers] = useState([]);

  // 2-Dimensional Multi-Select Status Filters
  // 1. 작성 여부: filterSubmitted (작성 완료), filterUnsubmitted (미작성)
  const [filterSubmitted, setFilterSubmitted] = useState(true);
  const [filterUnsubmitted, setFilterUnsubmitted] = useState(true);
  // 2. 대상 서류: Set of 'app' | 'pre' | 'post'
  const [selectedDocTypes, setSelectedDocTypes] = useState(new Set(['app', 'pre', 'post']));
  // 3. 결합 조건: 'or' (하나라도 해당) | 'and' (모두 해당)
  const [docMatchMode, setDocMatchMode] = useState('or');

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | 'thisWeek' | 'thisMonth' | ''

  // Selection for Batch Print
  const [selectedStudentNames, setSelectedStudentNames] = useState(new Set());

  // Batch Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printScope, setPrintScope] = useState('selected'); // 'selected' | 'filtered'
  const [includeApp, setIncludeApp] = useState(true);
  const [includePre, setIncludePre] = useState(true);
  const [includePost, setIncludePost] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);

  // -------------------------------------------------------------
  // Data Loading: daily_logs + application_forms + surveys
  // -------------------------------------------------------------
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      // 0. Fetch Teachers from DB (MainApp과 동일한 방식)
      try {
        const { data: tData, error: tErr } = await supabaseClient.from('teachers').select('*');
        if (!tErr && tData) {
          const formatted = tData.map(formatTeacherRow);
          setDbTeachers(formatted);
          setGlobalTeachersList(formatted);
        }
      } catch (err) {
        console.warn('teachers fetch error:', err);
      }

      // 1. Fetch Application Forms
      let appRecords = [];
      try {
        const { data, error } = await supabaseClient
          .from('application_forms')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) appRecords = data;
      } catch (err) {
        console.warn('application_forms fetch error:', err);
      }

      // LocalStorage Backup merge for applications
      try {
        const localApps = JSON.parse(localStorage.getItem('application_forms_backup') || '[]');
        localApps.forEach(item => {
          const name = item.applicant_name || item.applicantName;
          if (name && !appRecords.some(r => r.applicant_name === name)) {
            appRecords.push(item);
          }
        });
      } catch (e) {}

      const appMap = new Map();
      appRecords.forEach(r => {
        const name = (r.applicant_name || r.applicantName || '').trim();
        if (name && (!appMap.has(name) || new Date(r.created_at || 0) > new Date(appMap.get(name)?.created_at || 0))) {
          appMap.set(name, r);
        }
      });
      setApplicationsMap(appMap);

      // 2. Fetch Pre Surveys
      let preRecords = [];
      try {
        const { data, error } = await supabaseClient
          .from('pre_surveys')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) preRecords = data;
      } catch (err) {
        console.warn('pre_surveys fetch error:', err);
      }

      // LocalStorage Backup merge for pre surveys
      try {
        const localPres = JSON.parse(localStorage.getItem('digital_surveys_backup') || '[]');
        localPres.forEach(item => {
          const name = item.participant_name || item.participantName;
          if (name && !preRecords.some(r => r.participant_name === name)) {
            preRecords.push(item);
          }
        });
      } catch (e) {}

      const preMap = new Map();
      preRecords.forEach(r => {
        const name = (r.participant_name || r.participantName || '').trim();
        if (name && (!preMap.has(name) || new Date(r.created_at || 0) > new Date(preMap.get(name)?.created_at || 0))) {
          preMap.set(name, r);
        }
      });
      setPreSurveysMap(preMap);

      // 3. Fetch Post Surveys
      let postRecords = [];
      try {
        const { data, error } = await supabaseClient
          .from('post_surveys')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) postRecords = data;
      } catch (err) {
        console.warn('post_surveys fetch error:', err);
      }

      // LocalStorage Backup merge for post surveys
      try {
        const localPosts = JSON.parse(localStorage.getItem('digital_surveys_post_backup') || '[]');
        localPosts.forEach(item => {
          const name = item.participant_name || item.participantName;
          if (name && !postRecords.some(r => r.participant_name === name)) {
            postRecords.push(item);
          }
        });
      } catch (e) {}

      const postMap = new Map();
      postRecords.forEach(r => {
        const name = (r.participant_name || r.participantName || '').trim();
        if (name && (!postMap.has(name) || new Date(r.created_at || 0) > new Date(postMap.get(name)?.created_at || 0))) {
          postMap.set(name, r);
        }
      });
      setPostSurveysMap(postMap);

      // 4. Fetch Students from daily_logs
      let logs = [];
      let from = 0;
      const step = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabaseClient
          .from('daily_logs')
          .select('student, teacher, team, log_date')
          .neq('student', '')
          .not('student', 'is', null)
          .range(from, from + step - 1);
        if (error) {
          console.error('daily_logs error:', error);
          break;
        }
        if (data && data.length > 0) {
          logs = logs.concat(data);
          if (data.length < step) hasMore = false;
          else from += step;
        } else {
          hasMore = false;
        }
      }

      // Aggregate Unique Students
      const studentMap = new Map();

      logs.forEach(r => {
        const raw = r.student || '';
        const names = raw.split(/[\/,+&]/).map(s => s.trim()).filter(Boolean);
        names.forEach(name => {
          if (name.includes('보조강사') || name.includes('도선복지관')) return;
          if (!studentMap.has(name)) {
            const tSet = new Set();
            if (r.teacher) tSet.add(r.teacher);
            studentMap.set(name, {
              name,
              team: r.team || '1팀',
              teacher: r.teacher || '',
              teachers: tSet,
              firstDate: r.log_date || '',
              lastDate: r.log_date || '',
              lessonCount: 1
            });
          } else {
            const cur = studentMap.get(name);
            cur.lessonCount++;
            if (!cur.team && r.team) cur.team = r.team;
            if (r.teacher) cur.teachers.add(r.teacher);
            if (r.log_date && (!cur.lastDate || r.log_date >= cur.lastDate)) {
              cur.lastDate = r.log_date;
              if (r.teacher) cur.teacher = r.teacher;
              if (r.team) cur.team = r.team;
            }
            if (r.log_date && (!cur.firstDate || r.log_date < cur.firstDate)) cur.firstDate = r.log_date;
          }
        });
      });

      // Also ensure any applicants/participants in forms who might not be in logs are included!
      const ensureIncluded = (name, formDate) => {
        if (!name || name.includes('보조강사') || name.includes('도선복지관')) return;
        if (!studentMap.has(name)) {
          studentMap.set(name, {
            name,
            team: '1팀',
            teacher: '-',
            teachers: new Set(),
            firstDate: formDate || '',
            lastDate: formDate || '',
            lessonCount: 0
          });
        }
      };

      appMap.forEach((v, k) => ensureIncluded(k, v.sign_date || v.created_at?.slice(0, 10)));
      preMap.forEach((v, k) => ensureIncluded(k, v.survey_date || v.created_at?.slice(0, 10)));
      postMap.forEach((v, k) => ensureIncluded(k, v.survey_date || v.created_at?.slice(0, 10)));

      // Transform to student list with form statuses
      const studentList = Array.from(studentMap.values()).map(s => {
        const app = appMap.get(s.name) || null;
        const pre = preMap.get(s.name) || null;
        const post = postMap.get(s.name) || null;

        const isAppSubmitted = Boolean(app);
        const isPreSubmitted = Boolean(pre);
        const isPostSubmitted = Boolean(post);
        const isAllSubmitted = isAppSubmitted && isPreSubmitted && isPostSubmitted;

        // Effective Registration Date
        const regDate = app?.sign_date || pre?.survey_date || s.firstDate || '';

        return {
          ...s,
          app,
          preSurvey: pre,
          postSurvey: post,
          isAppSubmitted,
          isPreSubmitted,
          isPostSubmitted,
          isAllSubmitted,
          regDate
        };
      });

      // Sort alphabetically by name
      studentList.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      setStudents(studentList);
    } catch (e) {
      console.error('Failed to load student documents data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Listen to form saves from other tabs
    let channel = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel('form_status_channel');
        channel.onmessage = () => {
          loadData(true);
        };
      }
    } catch (e) {}

    return () => {
      if (channel) channel.close();
    };
  }, [loadData]);

  // -------------------------------------------------------------
  // Filter Logic
  // -------------------------------------------------------------
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // 1. Team filter
      if (teamFilter !== "전체" && s.team !== teamFilter) {
        return false;
      }

      // 2. Teacher filter
      if (teacherFilter !== "전체") {
        const matchesTeacher = s.teacher === teacherFilter || (s.teachers && s.teachers.has(teacherFilter));
        if (!matchesTeacher) return false;
      }

      // 3. Document Submission Status filter (2-dimensional multi-select)
      const isAllStatus = (filterSubmitted && filterUnsubmitted) || (!filterSubmitted && !filterUnsubmitted);
      // 3. Document Submission Status filter (2-dimensional multi-select)
      // 둘 다 꺼져 있으면 아무것도 선택되지 않은 것이므로 목록 제외
      if (!filterSubmitted && !filterUnsubmitted) {
        return false;
      }
      // 서류가 하나도 선택되지 않은 경우 목록 제외
      if (selectedDocTypes.size === 0) {
        return false;
      }

      // 둘 중 하나만 켜진 경우에만 필터링 적용 (둘 다 켜져 있으면 전체 통과)
      if (filterSubmitted !== filterUnsubmitted) {
        const activeDocs = Array.from(selectedDocTypes);
        const docResults = activeDocs.map(docKey => {
          let isSubmitted = false;
          if (docKey === 'app') isSubmitted = s.isAppSubmitted;
          else if (docKey === 'pre') isSubmitted = s.isPreSubmitted;
          else if (docKey === 'post') isSubmitted = s.isPostSubmitted;

          if (filterSubmitted) return isSubmitted;
          if (filterUnsubmitted) return !isSubmitted;
          return true;
        });

        const statusMatch = (docMatchMode === 'and')
          ? docResults.every(Boolean)
          : docResults.some(Boolean);

        if (!statusMatch) return false;
      }

      // 4. Date range filter (based on regDate or lastDate)
      const targetDate = s.regDate || s.lastDate;
      if (startDate && targetDate && targetDate < startDate) return false;
      if (endDate && targetDate && targetDate > endDate) return false;

      // 5. Search filter (Name or Chosung)
      if (searchTerm.trim()) {
        const lowerSearch = searchTerm.toLowerCase().replace(/\s+/g, '');
        const cleanName = s.name.toLowerCase().replace(/\s+/g, '');
        const cho = getSearchChoSung(s.name);
        if (!cleanName.includes(lowerSearch) && !cho.includes(lowerSearch)) {
          return false;
        }
      }

      return true;
    });
  }, [students, teamFilter, teacherFilter, filterSubmitted, filterUnsubmitted, selectedDocTypes, docMatchMode, startDate, endDate, searchTerm]);

  // 작성 여부 토글 (누를 때마다 단순 On/Off)
  const toggleSubmissionFilter = (type) => {
    if (type === 'submitted') {
      setFilterSubmitted(prev => !prev);
    } else if (type === 'unsubmitted') {
      setFilterUnsubmitted(prev => !prev);
    }
  };

  // 대상 서류 토글 (누를 때마다 단순 On/Off, 인쇄 대상 서류도 함께 동기화)
  const toggleDocType = (docKey) => {
    setSelectedDocTypes(prev => {
      const next = new Set(prev);
      if (next.has(docKey)) {
        next.delete(docKey);
      } else {
        next.add(docKey);
      }
      setIncludeApp(next.has('app'));
      setIncludePre(next.has('pre'));
      setIncludePost(next.has('post'));
      return next;
    });
  };

  // 작성 상태 필터 전체 초기화
  const handleResetStatusFilter = () => {
    setFilterSubmitted(true);
    setFilterUnsubmitted(true);
    setSelectedDocTypes(new Set(['app', 'pre', 'post']));
    setDocMatchMode('or');
    setIncludeApp(true);
    setIncludePre(true);
    setIncludePost(true);
  };

  const isCustomStatusFilterActive = !(filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 3);

  // -------------------------------------------------------------
  // Available Teachers for the selected team (MainApp fetchTeachersFromSheet와 100% 동일)
  // -------------------------------------------------------------
  const availableTeachers = useMemo(() => {
    if (!teamFilter || teamFilter === "전체" || !Array.isArray(dbTeachers) || dbTeachers.length === 0) {
      return [];
    }

    const teacherSet = new Set();
    dbTeachers
      .filter(t => t.team === teamFilter && t.is_active !== false)
      .forEach(t => {
        // MainApp과 동일: 1팀 특수 제외 규칙
        if (teamFilter === "1팀") {
          const clean = (t.name || "").replace(/\s/g, "");
          if (clean === "천은선" || clean === "서승희" || clean === "천은선서승희") return;
        }
        if (t.name) teacherSet.add(t.name.trim());
      });

    // MainApp과 동일: seq_num 및 getTeacherSortWeight 기준 정렬
    return Array.from(teacherSet).sort((a, b) => {
      const tA = dbTeachers.find(t => t.team === teamFilter && t.name === a);
      const tB = dbTeachers.find(t => t.team === teamFilter && t.name === b);
      const seqA = tA && tA.seq_num !== '' && tA.seq_num !== null ? parseInt(tA.seq_num, 10) : 999;
      const seqB = tB && tB.seq_num !== '' && tB.seq_num !== null ? parseInt(tB.seq_num, 10) : 999;
      if (seqA !== seqB) return seqA - seqB;
      return getTeacherSortWeight(teamFilter, a, dbTeachers) - getTeacherSortWeight(teamFilter, b, dbTeachers);
    });
  }, [dbTeachers, teamFilter]);

  const handleTeacherChange = (teacherName) => {
    setTeacherFilter(teacherName);
  };

  // -------------------------------------------------------------
  // KPI Statistics (소속 팀 및 담당 선생님 선택 시 해당 대상자 기준으로 집계)
  // -------------------------------------------------------------
  const stats = useMemo(() => {
    let targetStudents = teamFilter === "전체"
      ? students
      : students.filter(s => s.team === teamFilter);

    if (teacherFilter !== "전체") {
      targetStudents = targetStudents.filter(s => s.teacher === teacherFilter || (s.teachers && s.teachers.has(teacherFilter)));
    }

    const total = targetStudents.length;
    if (total === 0) return { total: 0, appCount: 0, preCount: 0, postCount: 0, allCount: 0, appPct: 0, prePct: 0, postPct: 0, allPct: 0 };

    const appCount = targetStudents.filter(s => s.isAppSubmitted).length;
    const preCount = targetStudents.filter(s => s.isPreSubmitted).length;
    const postCount = targetStudents.filter(s => s.isPostSubmitted).length;
    const allCount = targetStudents.filter(s => s.isAllSubmitted).length;

    return {
      total,
      appCount,
      preCount,
      postCount,
      allCount,
      appPct: total > 0 ? Math.round((appCount / total) * 100) : 0,
      prePct: total > 0 ? Math.round((preCount / total) * 100) : 0,
      postPct: total > 0 ? Math.round((postCount / total) * 100) : 0,
      allPct: total > 0 ? Math.round((allCount / total) * 100) : 0,
    };
  }, [students, teamFilter, teacherFilter]);

  // -------------------------------------------------------------
  // Checkbox Selection Handlers
  // -------------------------------------------------------------
  const isAllFilteredSelected = filteredStudents.length > 0 && filteredStudents.every(s => selectedStudentNames.has(s.name));

  const handleToggleSelectAll = () => {
    if (isAllFilteredSelected) {
      // Unselect all filtered
      const next = new Set(selectedStudentNames);
      filteredStudents.forEach(s => next.delete(s.name));
      setSelectedStudentNames(next);
    } else {
      // Select all filtered
      const next = new Set(selectedStudentNames);
      filteredStudents.forEach(s => next.add(s.name));
      setSelectedStudentNames(next);
    }
  };

  const handleToggleStudent = (name) => {
    const next = new Set(selectedStudentNames);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setSelectedStudentNames(next);
  };

  // Preset Date Handlers
  const handleDatePreset = (preset) => {
    setDatePreset(preset);
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'thisWeek') {
      const day = today.getDay();
      const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diffToMonday));
      const monStr = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      setStartDate(monStr);
      setEndDate(todayStr);
    } else if (preset === 'thisMonth') {
      setStartDate(`${yyyy}-${mm}-01`);
      setEndDate(todayStr);
    }
  };

  // -------------------------------------------------------------
  // Batch Print Execution
  // -------------------------------------------------------------
  const handleOpenPrintModal = (scope = 'selected') => {
    if (scope === 'selected' && selectedStudentNames.size === 0) {
      alert('일괄 인쇄할 학생을 먼저 선택해주세요 (체크박스 선택).');
      return;
    }
    if (selectedDocTypes.size === 0) {
      alert('출력할 대상 서류를 최소 1개 이상 선택해주세요.');
      return;
    }
    // 대상 서류에서 선택한 서류 상태를 인쇄 옵션 기본값으로 동기화
    setIncludeApp(selectedDocTypes.has('app'));
    setIncludePre(selectedDocTypes.has('pre'));
    setIncludePost(selectedDocTypes.has('post'));
    setPrintScope(scope);
    setIsPrintModalOpen(true);
  };

  const handleExecuteBatchPrint = async () => {
    const targetStudents = (printScope === 'selected')
      ? students.filter(s => selectedStudentNames.has(s.name))
      : filteredStudents;

    if (targetStudents.length === 0) {
      alert('인쇄 대상 학생이 없습니다.');
      return;
    }

    const canPrintApp = includeApp && selectedDocTypes.has('app');
    const canPrintPre = includePre && selectedDocTypes.has('pre');
    const canPrintPost = includePost && selectedDocTypes.has('post');

    if (!canPrintApp && !canPrintPre && !canPrintPost) {
      alert('선택된 대상 서류 중 인쇄할 서류(신청서, 사전설문지, 사후설문지)를 최소 1개 선택해주세요.');
      return;
    }

    setIsPrinting(true);

    try {
      let combinedPagesHtml = '';
      let printCount = 0;

      for (const s of targetStudents) {
        // 1. Application Form (작성 완료된 경우만 인쇄, 미작성 시 제외)
        if (canPrintApp && s.app) {
          combinedPagesHtml += renderApplicationFormHtml(s.app, s.name, false);
          printCount++;
        }

        // 2. Pre-Survey Form (작성 완료된 경우만 인쇄, 미작성 시 제외)
        if (canPrintPre && s.preSurvey) {
          combinedPagesHtml += renderSurveyFormHtml(s.preSurvey, s.name, 'pre', false, null);
          printCount++;
        }

        // 3. Post-Survey Form (작성 완료된 경우만 인쇄, 미작성 시 제외)
        if (canPrintPost && s.postSurvey) {
          combinedPagesHtml += renderSurveyFormHtml(s.postSurvey, s.name, 'post', false, s.preSurvey);
          printCount++;
        }
      }

      if (!combinedPagesHtml) {
        alert('선택한 조건에 해당하는 작성 완료된 서류가 없습니다.');
        setIsPrinting(false);
        return;
      }

      const title = `2027_디지털교육_참여자서류_일괄출력(${targetStudents.length}명_${printCount}건)`;
      executeBatchPrint(combinedPagesHtml, title);
      setIsPrintModalOpen(false);
    } catch (e) {
      console.error('Batch print failed:', e);
      alert('일괄 인쇄 생성 중 오류가 발생했습니다: ' + (e.message || e));
    } finally {
      setIsPrinting(false);
    }
  };

  // Single student print: 대상 서류에서 작성 완료된 서류만 인쇄 (미작성 시 인쇄 제외)
  const handlePrintSingleStudentAll = (s) => {
    if (selectedDocTypes.size === 0) {
      alert('출력할 대상 서류를 최소 1개 이상 선택해주세요.');
      return;
    }

    const activeDocs = [];
    if (selectedDocTypes.has('app') && s.app) {
      activeDocs.push({ type: 'app', label: '1)신청서' });
    }
    if (selectedDocTypes.has('pre') && s.preSurvey) {
      activeDocs.push({ type: 'pre', label: '2)사전설문' });
    }
    if (selectedDocTypes.has('post') && s.postSurvey) {
      activeDocs.push({ type: 'post', label: '3)사후설문' });
    }

    if (activeDocs.length === 0) {
      alert(`${s.name} 학생은 선택된 대상 서류 중 작성 완료된 서류가 없습니다.\n(미작성 서류는 인쇄되지 않습니다)`);
      return;
    }

    // 대상 서류가 단 1건인 경우: '근무일지 입력' 화면과 100% 동일하게 해당 원본 폼을 열고 자동 인쇄 실행
    if (activeDocs.length === 1) {
      const doc = activeDocs[0];
      if (doc.type === 'app') {
        const url = `/application_form.html?name=${encodeURIComponent(s.name)}&autoPrint=true`;
        window.open(url, '_blank');
        return;
      }
      if (doc.type === 'pre') {
        const url = `/survey_form.html?type=pre&name=${encodeURIComponent(s.name)}&surveyor=${encodeURIComponent(s.teacher || '')}&autoPrint=true`;
        window.open(url, '_blank');
        return;
      }
      if (doc.type === 'post') {
        const url = `/survey_form.html?type=post&name=${encodeURIComponent(s.name)}&surveyor=${encodeURIComponent(s.teacher || '')}&autoPrint=true`;
        window.open(url, '_blank');
        return;
      }
    }

    // 2건 이상인 경우: '근무일지 입력'과 100% 동일한 서식 및 A4 규격으로 일괄 인쇄 창 호출
    let html = '';
    const docLabels = [];
    if (selectedDocTypes.has('app') && s.app) {
      html += renderApplicationFormHtml(s.app, s.name, false);
      docLabels.push('1)신청서');
    }
    if (selectedDocTypes.has('pre') && s.preSurvey) {
      html += renderSurveyFormHtml(s.preSurvey, s.name, 'pre', false, null);
      docLabels.push('2)사전');
    }
    if (selectedDocTypes.has('post') && s.postSurvey) {
      html += renderSurveyFormHtml(s.postSurvey, s.name, 'post', false, s.preSurvey);
      docLabels.push('3)사후');
    }

    executeBatchPrint(html, `${s.name}_참여자서류(${docLabels.join('+')})`);
  };

  // -------------------------------------------------------------
  // Excel Export
  // -------------------------------------------------------------
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = '시립성동노인종합복지관';
      wb.created = new Date();

      const ws = wb.addWorksheet('참여자_서류작성현황', {
        pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 }
      });

      // Title Row
      ws.mergeCells('A1:L1');
      const titleCell = ws.getCell('A1');
      titleCell.value = '2027년 1:1 디지털 교육 참여자 서류 작성 현황표 (신청서·사전설문·사후설문)';
      titleCell.font = { name: '맑은 고딕', size: 16, bold: true, color: { argb: 'FF0F172A' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 36;

      // Meta info row
      ws.mergeCells('A2:L2');
      const metaCell = ws.getCell('A2');
      const statusDesc = (filterSubmitted && filterUnsubmitted)
        ? '전체'
        : filterSubmitted
          ? '작성완료'
          : '미작성';
      const docDesc = selectedDocTypes.size === 3
        ? '서류3종'
        : Array.from(selectedDocTypes).map(d => d === 'app' ? '신청서' : d === 'pre' ? '사전' : '사후').join('+');

      metaCell.value = `출력일시: ${new Date().toLocaleString('ko-KR')} | 필터: ${teamFilter}${teacherFilter !== '전체' ? ` (${teacherFilter} 선생님)` : ''} / 상태: ${statusDesc}[${docDesc}, ${docMatchMode.toUpperCase()}] | 대상자: ${filteredStudents.length}명 (신청서: ${stats.appCount}명, 사전: ${stats.preCount}명, 사후: ${stats.postCount}명, 3종완료: ${stats.allCount}명)`;
      metaCell.font = { name: '맑은 고딕', size: 10, color: { argb: 'FF475569' } };
      metaCell.alignment = { horizontal: 'right', vertical: 'middle' };
      ws.getRow(2).height = 20;

      // Header Row
      const headers = [
        '연번', '학생 성명', '소속 팀', '담당 강사', '등록/수업일',
        '신청서 작성여부', '신청서 작성일',
        '사전설문 여부', '사전설문 점수',
        '사후설문 여부', '사후설문 점수',
        '3종 완결여부'
      ];
      ws.addRow(headers);
      const headerRow = ws.getRow(3);
      headerRow.height = 28;
      headerRow.eachCell((cell) => {
        cell.font = { name: '맑은 고딕', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'medium' },
          right: { style: 'thin' }
        };
      });

      // Data Rows
      filteredStudents.forEach((s, idx) => {
        const appDate = s.app?.sign_date || s.app?.created_at?.slice(0, 10) || '-';
        const preScore = s.preSurvey ? `${s.preSurvey.score_total ?? '-'}점 (${s.preSurvey.score_average ?? '-'}점)` : '-';
        const postScore = s.postSurvey ? `${s.postSurvey.score_total ?? '-'}점 (${s.postSurvey.score_average ?? '-'}점)` : '-';

        const row = ws.addRow([
          idx + 1,
          s.name,
          s.team,
          s.teacher || '-',
          s.regDate || s.lastDate || '-',
          s.isAppSubmitted ? '완료 (O)' : '미작성 (X)',
          appDate,
          s.isPreSubmitted ? '완료 (O)' : '미작성 (X)',
          preScore,
          s.isPostSubmitted ? '완료 (O)' : '미작성 (X)',
          postScore,
          s.isAllSubmitted ? '★ 완결' : '미완결'
        ]);

        row.height = 22;
        row.eachCell((cell, colNum) => {
          cell.font = { name: '맑은 고딕', size: 10 };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };

          // Highlights for completion
          if (colNum === 6 && s.isAppSubmitted) cell.font = { bold: true, color: { argb: 'FF15803D' } };
          if (colNum === 8 && s.isPreSubmitted) cell.font = { bold: true, color: { argb: 'FF1D4ED8' } };
          if (colNum === 10 && s.isPostSubmitted) cell.font = { bold: true, color: { argb: 'FF7E22CE' } };
          if (colNum === 12) {
            cell.font = { bold: true, color: { argb: s.isAllSubmitted ? 'FF16A34A' : 'FFDC2626' } };
            if (s.isAllSubmitted) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
          }
        });
      });

      // Auto-fit column widths
      ws.columns = [
        { width: 8 },  // 연번
        { width: 14 }, // 성명
        { width: 12 }, // 팀
        { width: 14 }, // 강사
        { width: 15 }, // 일자
        { width: 16 }, // 신청서여부
        { width: 16 }, // 신청서작성일
        { width: 16 }, // 사전여부
        { width: 18 }, // 사전점수
        { width: 16 }, // 사후여부
        { width: 18 }, // 사후점수
        { width: 14 }  // 완결여부
      ];

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `참여자_서류작성현황_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Excel export error:', err);
      alert('엑셀 파일 생성 중 오류가 발생했습니다: ' + (err.message || err));
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800">

      {/* TOP HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onNavigateBack}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer flex items-center gap-1 font-bold text-sm"
              title="메인 화면으로 돌아가기"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden sm:inline">메인으로</span>
            </button>
            <div className="h-5 w-px bg-slate-300"></div>
            <div>
              <h1 className="text-base sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <span>📋 참여자 서류 관리 및 일괄 인쇄</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">담당복지사용</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                학생별 프로그램 참여 신청서, 사전 설문지, 사후 설문지 작성 여부 파악 및 기간/선택 일괄 출력
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="최신 서류 작성 데이터 다시 불러오기"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">새로고침</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="현재 목록 엑셀 파일로 다운로드"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">엑셀 다운로드</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-5">

        {/* 1. KPI SUMMARY DASHBOARD CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-4">
          {/* Total Students */}
          <div
            onClick={handleResetStatusFilter}
            className={`p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              !isCustomStatusFilterActive
                ? "bg-white border-blue-500 ring-2 ring-blue-500/20 shadow-sm"
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
            }`}
          >
            <div className="text-xs font-bold text-slate-600">
              {teacherFilter !== "전체"
                ? `${teacherFilter} 선생님 대상자`
                : teamFilter === "전체"
                  ? "전체 대상자"
                  : `${teamFilter} 대상자`}
            </div>
            <div className="text-2xl font-black mt-1 text-slate-900">
              {stats.total}
              <span className="text-sm font-normal ml-0.5 text-slate-500">
                명
              </span>
            </div>
            <div className="text-[11px] mt-0.5 text-blue-600 font-medium">
              {teacherFilter !== "전체"
                ? `클릭 시 ${teacherFilter} 선생님 전체 보기`
                : teamFilter === "전체"
                  ? "클릭 시 전체 보기"
                  : `클릭 시 ${teamFilter} 전체 보기`}
            </div>
          </div>

          {/* Application Status */}
          <div
            onClick={() => {
              setFilterSubmitted(false);
              setFilterUnsubmitted(true);
              setSelectedDocTypes(new Set(['app']));
              setDocMatchMode('or');
            }}
            className={`p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              (!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('app'))
                ? "bg-blue-600 text-white border-blue-600 ring-2 ring-blue-500 ring-offset-2 shadow-md"
                : "bg-white border-slate-200 text-slate-800 hover:border-blue-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${(!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('app')) ? "text-white" : "text-blue-600"}`}>
                신청서 작성
              </span>
              <span
                className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                  (!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('app')) ? "bg-white/25 text-white" : "bg-blue-50 text-blue-700"
                }`}
              >
                {stats.appPct}%
              </span>
            </div>
            <div className={`text-2xl font-black mt-1 ${(!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('app')) ? "text-white" : "text-slate-900"}`}>
              {stats.appCount}
              <span className={`text-sm font-normal ml-1 ${(!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('app')) ? "text-blue-100" : "text-slate-500"}`}>
                / {stats.total}명
              </span>
            </div>
            <div
              className={`text-[11px] font-bold mt-0.5 ${
                (!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('app')) ? "text-amber-200" : "text-rose-500"
              }`}
            >
              미작성: {stats.total - stats.appCount}명
            </div>
          </div>

          {/* Pre-Survey Status */}
          <div
            onClick={() => {
              setFilterSubmitted(false);
              setFilterUnsubmitted(true);
              setSelectedDocTypes(new Set(['pre']));
              setDocMatchMode('or');
            }}
            className={`p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              (!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('pre'))
                ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-500 ring-offset-2 shadow-md"
                : "bg-white border-slate-200 text-slate-800 hover:border-indigo-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${(!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('pre')) ? "text-white" : "text-indigo-600"}`}>
                사전설문 작성
              </span>
              <span
                className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                  (!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('pre')) ? "bg-white/25 text-white" : "bg-indigo-50 text-indigo-700"
                }`}
              >
                {stats.prePct}%
              </span>
            </div>
            <div className={`text-2xl font-black mt-1 ${(!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('pre')) ? "text-white" : "text-slate-900"}`}>
              {stats.preCount}
              <span className={`text-sm font-normal ml-1 ${(!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('pre')) ? "text-indigo-100" : "text-slate-500"}`}>
                / {stats.total}명
              </span>
            </div>
            <div
              className={`text-[11px] font-bold mt-0.5 ${
                (!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('pre')) ? "text-amber-200" : "text-rose-500"
              }`}
            >
              미작성: {stats.total - stats.preCount}명
            </div>
          </div>

          {/* Post-Survey Status */}
          <div
            onClick={() => {
              setFilterSubmitted(false);
              setFilterUnsubmitted(true);
              setSelectedDocTypes(new Set(['post']));
              setDocMatchMode('or');
            }}
            className={`p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              (!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('post'))
                ? "bg-purple-600 text-white border-purple-600 ring-2 ring-purple-500 ring-offset-2 shadow-md"
                : "bg-white border-slate-200 text-slate-800 hover:border-purple-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${(!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('post')) ? "text-white" : "text-purple-600"}`}>
                사후설문 작성
              </span>
              <span
                className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                  (!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('post')) ? "bg-white/25 text-white" : "bg-purple-50 text-purple-700"
                }`}
              >
                {stats.postPct}%
              </span>
            </div>
            <div className={`text-2xl font-black mt-1 ${(!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('post')) ? "text-white" : "text-slate-900"}`}>
              {stats.postCount}
              <span className={`text-sm font-normal ml-1 ${(!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('post')) ? "text-purple-100" : "text-slate-500"}`}>
                / {stats.total}명
              </span>
            </div>
            <div
              className={`text-[11px] font-bold mt-0.5 ${
                (!filterSubmitted && filterUnsubmitted && selectedDocTypes.size === 1 && selectedDocTypes.has('post')) ? "text-amber-200" : "text-rose-500"
              }`}
            >
              미작성: {stats.total - stats.postCount}명
            </div>
          </div>

          {/* All Completed */}
          <div
            onClick={() => {
              setFilterSubmitted(true);
              setFilterUnsubmitted(false);
              setSelectedDocTypes(new Set(['app', 'pre', 'post']));
              setDocMatchMode('and');
            }}
            className={`col-span-2 sm:col-span-1 p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              (filterSubmitted && !filterUnsubmitted && selectedDocTypes.size === 3 && docMatchMode === 'and')
                ? "bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-500 ring-offset-2 shadow-md"
                : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300 hover:shadow-xs"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${(filterSubmitted && !filterUnsubmitted && selectedDocTypes.size === 3 && docMatchMode === 'and') ? "text-white" : "text-emerald-700"}`}>
                3종 완결
              </span>
              <span
                className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${
                  (filterSubmitted && !filterUnsubmitted && selectedDocTypes.size === 3 && docMatchMode === 'and') ? "bg-white/25 text-white" : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {stats.allPct}%
              </span>
            </div>
            <div className={`text-2xl font-black mt-1 ${(filterSubmitted && !filterUnsubmitted && selectedDocTypes.size === 3 && docMatchMode === 'and') ? "text-white" : "text-slate-900"}`}>
              {stats.allCount}
              <span className={`text-sm font-normal ml-1 ${(filterSubmitted && !filterUnsubmitted && selectedDocTypes.size === 3 && docMatchMode === 'and') ? "text-emerald-100" : "text-slate-500"}`}>
                / {stats.total}명
              </span>
            </div>
            <div
              className={`text-[11px] font-semibold mt-0.5 ${
                (filterSubmitted && !filterUnsubmitted && selectedDocTypes.size === 3 && docMatchMode === 'and') ? "text-emerald-100" : "text-slate-500"
              }`}
            >
              신청서+사전+사후 완료
            </div>
          </div>
        </div>

        {/* 2. FILTER & SEARCH CONTROL BAR */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
          {/* Row 1: Team Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">소속 팀:</span>
            {['전체', '1팀', '2팀', '3팀', '취업팀'].map(team => (
              <button
                key={team}
                type="button"
                onClick={() => {
                  setTeamFilter(team);
                  setTeacherFilter('전체');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                  teamFilter === team
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {team}
              </button>
            ))}
          </div>

          {/* Row 2: Teacher Filter (팀선택 아래줄) */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">선생님:</span>
            <select
              value={teacherFilter}
              onChange={(e) => handleTeacherChange(e.target.value)}
              disabled={teamFilter === '전체'}
              className={`border rounded-lg px-2.5 py-1 text-xs font-bold focus:ring-2 focus:ring-blue-500 cursor-pointer transition ${
                teamFilter === '전체'
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : teacherFilter !== '전체'
                    ? 'bg-blue-50 border-blue-400 text-blue-800 shadow-2xs'
                    : 'bg-white border-slate-300 text-slate-800 hover:border-blue-400'
              }`}
            >
              <option value="전체">
                {teamFilter === '전체'
                  ? '팀을 먼저 선택하세요'
                  : `${teamFilter} 전체 선생님 (${availableTeachers.length}명)`}
              </option>
              {availableTeachers.map(t => (
                <option key={t} value={t}>
                  {t} 선생님
                </option>
              ))}
            </select>
            {teamFilter !== '전체' && teacherFilter !== '전체' && (
              <button
                type="button"
                onClick={() => setTeacherFilter('전체')}
                className="text-[11px] text-slate-400 hover:text-rose-500 underline font-semibold cursor-pointer ml-1"
                title="선생님 선택 해제"
              >
                해제
              </button>
            )}
          </div>

          {/* Middle Box: 2-Dimensional Multi-Select Document Status Filter */}
          <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200/80 space-y-2.5">
            {/* Row 1: 작성 구분 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-700 shrink-0 mr-1">작성 구분:</span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => toggleSubmissionFilter('submitted')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 select-none ${
                    filterSubmitted
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                  title={filterSubmitted ? "클릭 시 작성 완료 해제 (OFF)" : "클릭 시 작성 완료 선택 (ON)"}
                >
                  <span>{filterSubmitted ? '✓ ' : ''}작성 완료</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleSubmissionFilter('unsubmitted')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 select-none ${
                    filterUnsubmitted
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                  title={filterUnsubmitted ? "클릭 시 미작성 해제 (OFF)" : "클릭 시 미작성 선택 (ON)"}
                >
                  <span>{filterUnsubmitted ? '✓ ' : ''}미작성</span>
                </button>
              </div>
            </div>

            {/* Row 2: 대상 서류 */}
            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-200/60">
              <span className="text-xs font-bold text-slate-700 shrink-0 mr-1">대상 서류:</span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs flex-wrap">
                <button
                  type="button"
                  onClick={() => toggleDocType('app')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 select-none ${
                    selectedDocTypes.has('app')
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                  title={selectedDocTypes.has('app') ? "클릭 시 신청서 해제 (OFF)" : "클릭 시 신청서 선택 (ON)"}
                >
                  <span>{selectedDocTypes.has('app') ? '✓ ' : ''}참여 신청서</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleDocType('pre')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 select-none ${
                    selectedDocTypes.has('pre')
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                  title={selectedDocTypes.has('pre') ? "클릭 시 사전설문 해제 (OFF)" : "클릭 시 사전설문 선택 (ON)"}
                >
                  <span>{selectedDocTypes.has('pre') ? '✓ ' : ''}사전 설문지</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleDocType('post')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer flex items-center gap-1 select-none ${
                    selectedDocTypes.has('post')
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700'
                  }`}
                  title={selectedDocTypes.has('post') ? "클릭 시 사후설문 해제 (OFF)" : "클릭 시 사후설문 선택 (ON)"}
                >
                  <span>{selectedDocTypes.has('post') ? '✓ ' : ''}사후 설문지</span>
                </button>
              </div>
            </div>
          </div>

          {/* Date Range Picker (등록 기간 선택) */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">등록 기간:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('');
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 text-xs">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('');
                }}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Quick Date Presets (선택된 버튼 파란색 배경 표시) */}
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: 'all', label: '전체' },
                { id: 'today', label: '오늘' },
                { id: 'thisWeek', label: '이번주' },
                { id: 'thisMonth', label: '이번달' },
              ].map(p => {
                const isSelected = datePreset === p.id || (p.id === 'all' && !startDate && !endDate);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleDatePreset(p.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer select-none ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Input (등록일자 기간 아래로 이동) */}
          <div className="relative pt-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="학생 이름 또는 초성 검색 (예: 권미희, ㄱㅁㅎ)"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-8 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* 3. TABLE TOOLBAR (Selection Summary & Action Buttons) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllFilteredSelected}
                onChange={handleToggleSelectAll}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="ml-2 text-xs font-bold text-slate-700">현재 목록 전체 선택 ({filteredStudents.length}명)</span>
            </label>
            {selectedStudentNames.size > 0 && (
              <span className="text-xs bg-blue-100 text-blue-800 font-extrabold px-2.5 py-0.5 rounded-full">
                선택됨: {selectedStudentNames.size}명
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Selected Students Batch Print */}
            <button
              type="button"
              onClick={() => handleOpenPrintModal('selected')}
              disabled={selectedStudentNames.size === 0}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                selectedStudentNames.size > 0
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title="선택한 학생들의 서류를 하나의 PDF/인쇄물로 일괄 출력합니다"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>선택 학생 일괄 인쇄 ({selectedStudentNames.size}명)</span>
            </button>

            {/* Filtered All Batch Print */}
            <button
              type="button"
              onClick={() => handleOpenPrintModal('filtered')}
              disabled={filteredStudents.length === 0}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="현재 검색 및 기간 필터에 나타난 전체 학생의 서류를 일괄 인쇄합니다"
            >
              <span>기간/검색결과 전체 인쇄 ({filteredStudents.length}명)</span>
            </button>
          </div>
        </div>

        {/* 4. STUDENTS DOCUMENT STATUS TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={isAllFilteredSelected}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 text-center w-12">연번</th>
                  <th className="py-3 px-3">학생 성명</th>
                  <th className="py-3 px-3">소속 팀</th>
                  <th className="py-3 px-3">등록/수업일</th>
                  {selectedDocTypes.has('app') && (
                    <th className="py-3 px-3 text-center">① 참여 신청서</th>
                  )}
                  {selectedDocTypes.has('pre') && (
                    <th className="py-3 px-3 text-center">② 사전 설문지</th>
                  )}
                  {selectedDocTypes.has('post') && (
                    <th className="py-3 px-3 text-center">③ 사후 설문지</th>
                  )}
                  <th className="py-3 px-3 text-center">개별 출력</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6 + selectedDocTypes.size} className="py-12 text-center text-slate-400">
                      <div className="inline-block w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                      <p className="text-xs font-semibold">참여자 서류 데이터를 집계하는 중입니다...</p>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={6 + selectedDocTypes.size} className="py-12 text-center text-slate-400">
                      <p className="text-sm font-semibold">검색 조건에 일치하는 대상자가 없습니다.</p>
                      <p className="text-xs text-slate-400 mt-1">팀이나 작성 상태, 기간 필터를 변경해보세요.</p>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s, idx) => {
                    const isSelected = selectedStudentNames.has(s.name);
                    const appUrl = `/application_form.html?name=${encodeURIComponent(s.name)}`;
                    const preUrl = `/survey_form.html?type=pre&name=${encodeURIComponent(s.name)}&surveyor=${encodeURIComponent(s.teacher || '')}`;
                    const postUrl = `/survey_form.html?type=post&name=${encodeURIComponent(s.name)}&surveyor=${encodeURIComponent(s.teacher || '')}`;

                    // 대상 서류 중 작성 완료된 서류가 1건이라도 있는지 확인 (미작성 서류는 인쇄 불가)
                    const hasAnyCompletedDoc = (
                      (selectedDocTypes.has('app') && Boolean(s.app)) ||
                      (selectedDocTypes.has('pre') && Boolean(s.preSurvey)) ||
                      (selectedDocTypes.has('post') && Boolean(s.postSurvey))
                    );

                    return (
                      <tr
                        key={s.name}
                        className={`transition hover:bg-slate-50/80 ${isSelected ? 'bg-blue-50/40' : ''}`}
                      >
                        {/* Checkbox */}
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleStudent(s.name)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Index */}
                        <td className="py-2.5 px-3 text-center text-slate-400 text-xs font-medium">
                          {idx + 1}
                        </td>

                        {/* Student Name */}
                        <td className="py-2.5 px-3">
                          <div className="font-extrabold text-slate-900 text-sm">{s.name}</div>
                          <div className="text-[11px] text-slate-400">수업 {s.lessonCount}회차</div>
                        </td>

                        {/* Team */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800 text-xs">{s.team}</div>
                        </td>

                        {/* Registration Date / Last Lesson */}
                        <td className="py-2.5 px-3 text-xs text-slate-600">
                          <div>{s.regDate || s.lastDate || '-'}</div>
                          <div className="text-[10px] text-slate-400">최근: {s.lastDate || '-'}</div>
                        </td>

                        {/* 1. Application Form Status Button */}
                        {selectedDocTypes.has('app') && (
                          <td className="py-2.5 px-3 text-center">
                            {s.isAppSubmitted ? (
                              <button
                                type="button"
                                onClick={() => window.open(appUrl, '_blank')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition cursor-pointer"
                                title={`신청서 열기 및 수정 (${s.app?.sign_date || s.app?.created_at?.slice(0, 10) || '완료'})`}
                              >
                                <span>✅ 완료</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => window.open(appUrl, '_blank')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 font-semibold text-xs border border-slate-200 transition cursor-pointer"
                                title="클릭하여 새 신청서 작성"
                              >
                                <span>❌ 미작성</span>
                                <span className="text-[10px] text-blue-600 font-bold ml-0.5">+작성</span>
                              </button>
                            )}
                          </td>
                        )}

                        {/* 2. Pre-Survey Status Button */}
                        {selectedDocTypes.has('pre') && (
                          <td className="py-2.5 px-3 text-center">
                            {s.isPreSubmitted ? (
                              <button
                                type="button"
                                onClick={() => window.open(preUrl, '_blank')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs border border-indigo-200 transition cursor-pointer"
                                title="사전설문지 열기 및 수정"
                              >
                                <span>✅ 완료</span>
                                <span className="text-[10px] text-indigo-600 font-bold">({s.preSurvey.score_total ?? 0}점)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => window.open(preUrl, '_blank')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 font-semibold text-xs border border-slate-200 transition cursor-pointer"
                                title="클릭하여 새 사전설문지 작성"
                              >
                                <span>❌ 미작성</span>
                                <span className="text-[10px] text-indigo-600 font-bold ml-0.5">+작성</span>
                              </button>
                            )}
                          </td>
                        )}

                        {/* 3. Post-Survey Status Button */}
                        {selectedDocTypes.has('post') && (
                          <td className="py-2.5 px-3 text-center">
                            {s.isPostSubmitted ? (
                              <button
                                type="button"
                                onClick={() => window.open(postUrl, '_blank')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs border border-purple-200 transition cursor-pointer"
                                title="사후설문지 열기 및 수정"
                              >
                                <span>✅ 완료</span>
                                <span className="text-[10px] text-purple-600 font-bold">({s.postSurvey.score_total ?? 0}점)</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => window.open(postUrl, '_blank')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700 font-semibold text-xs border border-slate-200 transition cursor-pointer"
                                title="클릭하여 새 사후설문지 작성"
                              >
                                <span>❌ 미작성</span>
                                <span className="text-[10px] text-purple-700 font-bold ml-0.5">+작성</span>
                              </button>
                            )}
                          </td>
                        )}

                        {/* Single Print Action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            disabled={!hasAnyCompletedDoc}
                            onClick={() => handlePrintSingleStudentAll(s)}
                            className={`px-2 py-1 rounded text-xs font-bold transition ${
                              hasAnyCompletedDoc
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shadow-2xs'
                                : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed'
                            }`}
                            title={hasAnyCompletedDoc ? "선택된 대상 서류 인쇄/PDF 저장" : "작성 완료된 대상 서류가 없습니다 (미작성 서류는 인쇄 불가)"}
                          >
                            🖨️ 인쇄
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* ============================================================== */}
      {/* BATCH PRINT CONFIGURATION MODAL                                */}
      {/* ============================================================== */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-fadeIn">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <span>🖨️ 서류 일괄 인쇄 (PDF 저장) 설정</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  선택한 학생들의 참여신청서 및 설문지를 하나의 연속 문서로 일괄 출력합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs sm:text-sm">
              {/* 1. Target Students Scope */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-800 mb-1 flex items-center justify-between">
                  <span>1. 인쇄 대상 학생</span>
                  <span className="text-blue-700 font-extrabold">
                    {printScope === 'selected' ? `${selectedStudentNames.size}명` : `${filteredStudents.length}명`}
                  </span>
                </div>
                <div className="text-slate-600 text-xs">
                  {printScope === 'selected'
                    ? `체크박스로 선택한 학생 총 ${selectedStudentNames.size}명의 서류를 출력합니다.`
                    : `현재 검색/기간 필터 결과 학생 총 ${filteredStudents.length}명의 서류를 출력합니다.`}
                </div>
              </div>

              {/* 2. Documents Selection */}
              <div>
                <div className="font-bold text-slate-800 mb-2">2. 출력할 서류 종류 선택 (대상 서류 필터 연동)</div>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {selectedDocTypes.has('app') && (
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeApp}
                        onChange={(e) => setIncludeApp(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800">📄 프로그램 참여 신청서 (1페이지)</span>
                    </label>
                  )}
                  {selectedDocTypes.has('pre') && (
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includePre}
                        onChange={(e) => setIncludePre(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800">📋 1:1 디지털 교육 사전 설문조사지 (2페이지)</span>
                    </label>
                  )}
                  {selectedDocTypes.has('post') && (
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includePost}
                        onChange={(e) => setIncludePost(e.target.checked)}
                        className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                      <span className="font-bold text-slate-800">📊 1:1 디지털 교육 사후 설문조사지 (2페이지, 비교분석 포함)</span>
                    </label>
                  )}
                  {selectedDocTypes.size === 0 && (
                    <div className="text-rose-500 font-bold text-xs py-1">
                      상단 대상 서류에서 최소 1개 이상의 서류를 선택해주세요.
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Completed Only Notice */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed">
                ✅ <strong>작성 완료된 서류만 인쇄</strong>: 미작성된 서류는 자동으로 인쇄에서 제외되며, 작성이 완료된 서류만 연속 페이지로 출력합니다.
              </div>

              {/* Notice Tip */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 leading-relaxed">
                💡 <strong>PDF 일괄 저장 팁</strong>: 인쇄 창 상단의 <strong>[대상/프린터]</strong>에서 <strong>[PDF로 저장]</strong>을 선택하시면 수십 명의 서류가 단 하나의 깔끔한 PDF 파일로 일괄 저장됩니다.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-xl border border-slate-300 transition text-xs cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchPrint}
                disabled={isPrinting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-xs flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isPrinting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>문서 생성 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    <span>인쇄 / PDF 저장 실행</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
