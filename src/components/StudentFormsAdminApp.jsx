// ==============================================================
// 담당복지사용 참여자 서류 관리 및 일괄 인쇄 (신청서·사전/사후설문지)
// ==============================================================

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabaseClient } from '../utils/supabase';
import {
  getSavedItem,
  setSavedItem,
  getTeamTeacherNames
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

  // Filter States
  const [teamFilter, setTeamFilter] = useState("전체");
  const [statusFilter, setStatusFilter] = useState("전체"); // '전체' | '모두완료' | '신청서미작성' | '사전미작성' | '사후미작성' | '미완료'
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Selection for Batch Print
  const [selectedStudentNames, setSelectedStudentNames] = useState(new Set());

  // Batch Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printScope, setPrintScope] = useState('selected'); // 'selected' | 'filtered'
  const [includeApp, setIncludeApp] = useState(true);
  const [includePre, setIncludePre] = useState(true);
  const [includePost, setIncludePost] = useState(true);
  const [printMode, setPrintMode] = useState('completed_only'); // 'completed_only' | 'include_blank'
  const [isPrinting, setIsPrinting] = useState(false);

  // -------------------------------------------------------------
  // Data Loading: daily_logs + application_forms + surveys
  // -------------------------------------------------------------
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
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
            studentMap.set(name, {
              name,
              team: r.team || '1팀',
              teacher: r.teacher || '',
              firstDate: r.log_date || '',
              lastDate: r.log_date || '',
              lessonCount: 1
            });
          } else {
            const cur = studentMap.get(name);
            cur.lessonCount++;
            if (!cur.team && r.team) cur.team = r.team;
            if (!cur.teacher && r.teacher) cur.teacher = r.teacher;
            if (r.log_date && (!cur.firstDate || r.log_date < cur.firstDate)) cur.firstDate = r.log_date;
            if (r.log_date && (!cur.lastDate || r.log_date > cur.lastDate)) cur.lastDate = r.log_date;
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

      // 2. Status filter
      if (statusFilter === "모두완료" && !s.isAllSubmitted) return false;
      if (statusFilter === "신청서미작성" && s.isAppSubmitted) return false;
      if (statusFilter === "사전미작성" && s.isPreSubmitted) return false;
      if (statusFilter === "사후미작성" && s.isPostSubmitted) return false;
      if (statusFilter === "미완료" && s.isAllSubmitted) return false;

      // 3. Date range filter (based on regDate or lastDate)
      const targetDate = s.regDate || s.lastDate;
      if (startDate && targetDate && targetDate < startDate) return false;
      if (endDate && targetDate && targetDate > endDate) return false;

      // 4. Search filter (Name or Chosung)
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
  }, [students, teamFilter, statusFilter, startDate, endDate, searchTerm]);

  // -------------------------------------------------------------
  // KPI Statistics
  // -------------------------------------------------------------
  const stats = useMemo(() => {
    const total = students.length;
    if (total === 0) return { total: 0, appCount: 0, preCount: 0, postCount: 0, allCount: 0, appPct: 0, prePct: 0, postPct: 0, allPct: 0 };

    const appCount = students.filter(s => s.isAppSubmitted).length;
    const preCount = students.filter(s => s.isPreSubmitted).length;
    const postCount = students.filter(s => s.isPostSubmitted).length;
    const allCount = students.filter(s => s.isAllSubmitted).length;

    return {
      total,
      appCount,
      preCount,
      postCount,
      allCount,
      appPct: Math.round((appCount / total) * 100),
      prePct: Math.round((preCount / total) * 100),
      postPct: Math.round((postCount / total) * 100),
      allPct: Math.round((allCount / total) * 100),
    };
  }, [students]);

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

    if (!includeApp && !includePre && !includePost) {
      alert('인쇄할 서류(신청서, 사전설문지, 사후설문지 중 최소 1개)를 선택해주세요.');
      return;
    }

    setIsPrinting(true);

    try {
      let combinedPagesHtml = '';
      let printCount = 0;

      for (const s of targetStudents) {
        // 1. Application Form
        if (includeApp) {
          if (s.app) {
            combinedPagesHtml += renderApplicationFormHtml(s.app, s.name, false);
            printCount++;
          } else if (printMode === 'include_blank') {
            combinedPagesHtml += renderApplicationFormHtml(null, s.name, true);
            printCount++;
          }
        }

        // 2. Pre-Survey Form
        if (includePre) {
          if (s.preSurvey) {
            combinedPagesHtml += renderSurveyFormHtml(s.preSurvey, s.name, 'pre', false, null);
            printCount++;
          } else if (printMode === 'include_blank') {
            combinedPagesHtml += renderSurveyFormHtml(null, s.name, 'pre', true, null);
            printCount++;
          }
        }

        // 3. Post-Survey Form
        if (includePost) {
          if (s.postSurvey) {
            combinedPagesHtml += renderSurveyFormHtml(s.postSurvey, s.name, 'post', false, s.preSurvey);
            printCount++;
          } else if (printMode === 'include_blank') {
            combinedPagesHtml += renderSurveyFormHtml(null, s.name, 'post', true, s.preSurvey);
            printCount++;
          }
        }
      }

      if (!combinedPagesHtml) {
        alert('선택한 조건에 해당하는 작성 완료된 서류가 없습니다.\n(미작성자 빈 양식을 함께 출력하시려면 "미작성자 빈 양식 포함"을 선택해주세요)');
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

  // Single student 3-form print shortcut
  const handlePrintSingleStudentAll = (s) => {
    let html = '';
    let count = 0;
    if (s.app) { html += renderApplicationFormHtml(s.app, s.name, false); count++; }
    else { html += renderApplicationFormHtml(null, s.name, true); count++; }

    if (s.preSurvey) { html += renderSurveyFormHtml(s.preSurvey, s.name, 'pre', false, null); count++; }
    else { html += renderSurveyFormHtml(null, s.name, 'pre', true, null); count++; }

    if (s.postSurvey) { html += renderSurveyFormHtml(s.postSurvey, s.name, 'post', false, s.preSurvey); count++; }
    else { html += renderSurveyFormHtml(null, s.name, 'post', true, s.preSurvey); count++; }

    executeBatchPrint(html, `${s.name}_참여자서류전체(3종)`);
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
      metaCell.value = `출력일시: ${new Date().toLocaleString('ko-KR')} | 총 대상자: ${filteredStudents.length}명 (신청서: ${stats.appCount}명, 사전: ${stats.preCount}명, 사후: ${stats.postCount}명, 3종완료: ${stats.allCount}명)`;
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
            onClick={() => setStatusFilter("전체")}
            className={`p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              statusFilter === "전체" ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-800 hover:border-slate-300"
            }`}
          >
            <div className="text-xs font-semibold opacity-80">전체 대상자</div>
            <div className="text-2xl font-black mt-1">{stats.total}<span className="text-sm font-normal ml-0.5">명</span></div>
            <div className="text-[11px] opacity-75 mt-0.5">클릭 시 전체 보기</div>
          </div>

          {/* Application Status */}
          <div
            onClick={() => setStatusFilter("신청서미작성")}
            className={`p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              statusFilter === "신청서미작성" ? "bg-blue-700 text-white border-blue-700" : "bg-white border-slate-200 text-slate-800 hover:border-blue-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600">신청서 작성</span>
              <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700">{stats.appPct}%</span>
            </div>
            <div className="text-2xl font-black mt-1 text-blue-900">{stats.appCount}<span className="text-sm font-normal text-slate-500 ml-1">/ {stats.total}명</span></div>
            <div className="text-[11px] text-rose-500 font-semibold mt-0.5">미작성: {stats.total - stats.appCount}명</div>
          </div>

          {/* Pre-Survey Status */}
          <div
            onClick={() => setStatusFilter("사전미작성")}
            className={`p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              statusFilter === "사전미작성" ? "bg-indigo-700 text-white border-indigo-700" : "bg-white border-slate-200 text-slate-800 hover:border-indigo-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-indigo-600">사전설문 작성</span>
              <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700">{stats.prePct}%</span>
            </div>
            <div className="text-2xl font-black mt-1 text-indigo-900">{stats.preCount}<span className="text-sm font-normal text-slate-500 ml-1">/ {stats.total}명</span></div>
            <div className="text-[11px] text-rose-500 font-semibold mt-0.5">미작성: {stats.total - stats.preCount}명</div>
          </div>

          {/* Post-Survey Status */}
          <div
            onClick={() => setStatusFilter("사후미작성")}
            className={`p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              statusFilter === "사후미작성" ? "bg-purple-700 text-white border-purple-700" : "bg-white border-slate-200 text-slate-800 hover:border-purple-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-purple-700">사후설문 작성</span>
              <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700">{stats.postPct}%</span>
            </div>
            <div className="text-2xl font-black mt-1 text-purple-950">{stats.postCount}<span className="text-sm font-normal text-slate-500 ml-1">/ {stats.total}명</span></div>
            <div className="text-[11px] text-rose-500 font-semibold mt-0.5">미작성: {stats.total - stats.postCount}명</div>
          </div>

          {/* All Completed */}
          <div
            onClick={() => setStatusFilter("모두완료")}
            className={`col-span-2 sm:col-span-1 p-3.5 rounded-xl border transition cursor-pointer shadow-xs ${
              statusFilter === "모두완료" ? "bg-emerald-700 text-white border-emerald-700" : "bg-white border-slate-200 text-slate-800 hover:border-emerald-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">3종 완결</span>
              <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700">{stats.allPct}%</span>
            </div>
            <div className="text-2xl font-black mt-1 text-emerald-950">{stats.allCount}<span className="text-sm font-normal text-slate-500 ml-1">/ {stats.total}명</span></div>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">신청서+사전+사후 완료</div>
          </div>
        </div>

        {/* 2. FILTER & SEARCH CONTROL BAR */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3.5">
          {/* Top Row: Team Tabs & Status Filter */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            {/* Team Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">소속 팀:</span>
              {['전체', '1팀', '2팀', '3팀', '취업팀'].map(team => (
                <button
                  key={team}
                  type="button"
                  onClick={() => setTeamFilter(team)}
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

            {/* Status Dropdown / Chips */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 shrink-0">작성 상태:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                <option value="전체">전체 상태 보기</option>
                <option value="모두완료">✅ 3종 모두 완료</option>
                <option value="신청서미작성">⚠️ 신청서 미작성</option>
                <option value="사전미작성">⚠️ 사전설문 미작성</option>
                <option value="사후미작성">⚠️ 사후설문 미작성</option>
                <option value="미완료">⏳ 1종 이상 미작성</option>
              </select>
            </div>
          </div>

          {/* Bottom Row: Date Range & Search Input */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Date Range Picker (등록일자 기간별 선택) */}
            <div className="md:col-span-7 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500 shrink-0 mr-1">등록일자 기간:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400 text-xs">~</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-1 ml-1">
                <button
                  type="button"
                  onClick={() => handleDatePreset('all')}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-semibold"
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('today')}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-semibold"
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('thisWeek')}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-semibold"
                >
                  이번주
                </button>
                <button
                  type="button"
                  onClick={() => handleDatePreset('thisMonth')}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-semibold"
                >
                  이번달
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="학생 이름 또는 초성 검색 (예: 권미희, ㄱㅁㅎ)"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-8 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
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
                  <th className="py-3 px-3">팀 / 강사</th>
                  <th className="py-3 px-3">등록/수업일</th>
                  <th className="py-3 px-3 text-center">① 참여 신청서</th>
                  <th className="py-3 px-3 text-center">② 사전 설문지</th>
                  <th className="py-3 px-3 text-center">③ 사후 설문지</th>
                  <th className="py-3 px-3 text-center">완결 여부</th>
                  <th className="py-3 px-3 text-center">개별 출력</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-slate-400">
                      <div className="inline-block w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                      <p className="text-xs font-semibold">참여자 서류 데이터를 집계하는 중입니다...</p>
                    </td>
                  </tr>
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="py-12 text-center text-slate-400">
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

                        {/* Team / Teacher */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800 text-xs">{s.team}</div>
                          <div className="text-[11px] text-slate-500">강사: {s.teacher || '-'}</div>
                        </td>

                        {/* Registration Date / Last Lesson */}
                        <td className="py-2.5 px-3 text-xs text-slate-600">
                          <div>{s.regDate || s.lastDate || '-'}</div>
                          <div className="text-[10px] text-slate-400">최근: {s.lastDate || '-'}</div>
                        </td>

                        {/* 1. Application Form Status Button */}
                        <td className="py-2.5 px-3 text-center">
                          {s.isAppSubmitted ? (
                            <button
                              type="button"
                              onClick={() => window.open(appUrl, '_blank')}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs border border-emerald-200 transition cursor-pointer"
                              title="신청서 열기 및 수정"
                            >
                              <span>✅ 작성완료</span>
                              <span className="text-[10px] text-emerald-600 font-normal">({s.app?.sign_date || s.app?.created_at?.slice(0, 10)})</span>
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

                        {/* 2. Pre-Survey Status Button */}
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

                        {/* 3. Post-Survey Status Button */}
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

                        {/* All Completed Badge */}
                        <td className="py-2.5 px-3 text-center">
                          {s.isAllSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold text-[11px]">
                              ★ 3종 완결
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 font-medium">
                              미완결
                            </span>
                          )}
                        </td>

                        {/* Single Print Action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePrintSingleStudentAll(s)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                            title="이 학생의 서류 3종 한 번에 인쇄/PDF 저장"
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
                <div className="font-bold text-slate-800 mb-2">2. 출력할 서류 종류 선택 (다중 선택 가능)</div>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeApp}
                      onChange={(e) => setIncludeApp(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-800">📄 프로그램 참여 신청서 (1페이지)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includePre}
                      onChange={(e) => setIncludePre(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-800">📋 1:1 디지털 교육 사전 설문조사지 (2페이지)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includePost}
                      onChange={(e) => setIncludePost(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                    />
                    <span className="font-bold text-slate-800">📊 1:1 디지털 교육 사후 설문조사지 (2페이지, 비교분석 포함)</span>
                  </label>
                </div>
              </div>

              {/* 3. Print Mode Selection */}
              <div>
                <div className="font-bold text-slate-800 mb-2">3. 미작성 서류 처리 방식</div>
                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="printMode"
                      value="completed_only"
                      checked={printMode === 'completed_only'}
                      onChange={() => setPrintMode('completed_only')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-slate-800">작성 완료된 정식 서류만 인쇄 (권장)</div>
                      <div className="text-slate-500 text-xs">서명과 답변이 기재된 실제 완료 서류만 모아서 깔끔하게 출력합니다.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="radio"
                      name="printMode"
                      value="include_blank"
                      checked={printMode === 'include_blank'}
                      onChange={() => setPrintMode('include_blank')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <div className="font-bold text-slate-800">미작성자도 학생 이름이 채워진 빈 양식으로 인쇄</div>
                      <div className="text-slate-500 text-xs">현장 수업 배포용으로, 미작성 서류도 학생 성명이 인쇄된 빈 서식으로 함께 출력합니다.</div>
                    </div>
                  </label>
                </div>
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
