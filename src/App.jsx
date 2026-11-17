import React, { useState, useEffect, Suspense, lazy } from 'react';
import MainApp from './components/MainApp';
import {
  getSessionItem,
  setSessionItem,
  getSavedItem,
  setSavedItem,
  fetchAllTeachersFromDb
} from './utils/helpers';

const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    let pageHasAlreadyBeenForceRefreshed = false;
    try {
      pageHasAlreadyBeenForceRefreshed = JSON.parse(
        window.sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
      );
    } catch (e) {}
    try {
      const component = await componentImport();
      try {
        window.sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      } catch (e) {}
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        try {
          window.sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        } catch (e) {}
        window.location.reload(true);
        return new Promise(() => {});
      }
      throw error;
    }
  });

const ClassroomApp = lazyWithRetry(() => import('./components/ClassroomApp'));
const DailyScheduleApp = lazyWithRetry(() => import('./components/DailyScheduleApp'));
const TeamScheduleApp = lazyWithRetry(() => import('./components/TeamScheduleApp'));
const MyWeeklyScheduleApp = lazyWithRetry(() => import('./components/MyWeeklyScheduleApp'));
const StudentSearchApp = lazyWithRetry(() => import('./components/StudentSearchApp'));
const TeacherManagementApp = lazyWithRetry(() => import('./components/TeacherManagementApp'));
const AutoScheduleApp = lazyWithRetry(() => import('./components/AutoScheduleApp'));
const HolidayManagementApp = lazyWithRetry(() => import('./components/HolidayManagementApp'));
const NangmanStudioApp = lazyWithRetry(() => import('./components/NangmanStudioApp'));
const NoticeManagementApp = lazyWithRetry(() => import('./components/NoticeManagementApp'));
const StudentFormsAdminApp = lazyWithRetry(() => import('./components/StudentFormsAdminApp'));

const LoadingFallback = () => (
  <div className="min-h-[100dvh] flex flex-col items-center justify-center">
    <div className="w-12 h-12 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
    <p className="mt-4 text-base font-semibold text-gray-500 animate-pulse">화면을 불러오는 중...</p>
  </div>
);

export default function App() {
  const [currentView, setCurrentView] = useState(() => {
    const urlView = new URLSearchParams(window.location.search).get('view');
    if (urlView) return urlView;
    return getSessionItem('sungdong_current_view', 'main');
  });
  const [selectedTeamForSchedule, setSelectedTeamForSchedule] = useState(() => getSavedItem('sungdong_schedule_team', '') || getSavedItem('sungdong_team', ''));
  const [selectedTeacherForWeekly, setSelectedTeacherForWeekly] = useState(() => getSavedItem('sungdong_weekly_teacher', '') || getSavedItem('sungdong_teacher', ''));
  const [selectedFormsTeacher, setSelectedFormsTeacher] = useState(() => getSavedItem('sungdong_teacher', ''));
  const [selectedFormsTeam, setSelectedFormsTeam] = useState(() => getSavedItem('sungdong_team', ''));
  const [isFormsAdminMode, setIsFormsAdminMode] = useState(false);
  const [selectedNoticeForView, setSelectedNoticeForView] = useState(null);

  useEffect(() => {
    setSessionItem('sungdong_current_view', currentView);
    // 메뉴(화면) 전환 시 구글 애널리틱스로 페이지 뷰 이벤트 전송
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: currentView,
        page_path: '/' + currentView
      });
    }
  }, [currentView]);

  useEffect(() => {
    if (selectedTeamForSchedule) {
      setSavedItem('sungdong_schedule_team', selectedTeamForSchedule);
    }
  }, [selectedTeamForSchedule]);

  useEffect(() => {
    if (selectedTeacherForWeekly) {
      setSavedItem('sungdong_weekly_teacher', selectedTeacherForWeekly);
    }
  }, [selectedTeacherForWeekly]);

  useEffect(() => {
    fetchAllTeachersFromDb();
  }, []);

  // [전역 버전 체크 및 자동 최신화 로직]
  // 어느 화면에 있든 새 버전이 배포되면 스마트폰/PC에서 즉시 감지하여 최신 코드로 자동 새로고침합니다.
  useEffect(() => {
    const checkVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${new Date().getTime()}`);
        if (res.ok) {
          const contentType = res.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await res.json();
            if (data && data.version) {
              const serverVersion = Number(data.version);
              const clientVersion = Number(import.meta.env.VITE_APP_VERSION);
              if (clientVersion && serverVersion > clientVersion) {
                console.log('새 버전이 배포되어 앱을 최신 상태로 갱신합니다.', { clientVersion, serverVersion });
                const activeView = getSessionItem('sungdong_current_view', 'main');
                // 서류 관리, 일정 관리 등 작업/조회 화면에서는 강제 새로고침을 하지 않고 메인 화면일 때만 갱신
                if (activeView === 'main') {
                  window.location.reload(true);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('앱 버전 확인 오류:', err);
      }
    };

    checkVersion();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkVersion);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkVersion);
    };
  }, []);

  const renderView = () => {
    if (currentView === 'classroom') {
      return (
        <ClassroomApp
          onNavigateBack={() => setCurrentView('main')}
          onNavigateToNangmanStudio={() => setCurrentView('nangmanStudio')}
        />
      );
    }

    if (currentView === 'dailySchedule') {
      return (
        <DailyScheduleApp
          initialTeam={selectedTeamForSchedule}
          onNavigateBack={() => setCurrentView('main')}
          onTeamChange={(team) => setSelectedTeamForSchedule(team)}
        />
      );
    }

    if (currentView === 'teamSchedule') {
      return <TeamScheduleApp team={selectedTeamForSchedule} onNavigateBack={() => setCurrentView('main')} />;
    }

    if (currentView === 'myWeeklySchedule') {
      const activeTeam = selectedTeamForSchedule || getSavedItem('sungdong_schedule_team', '') || getSavedItem('sungdong_team', '');
      const activeTeacher = selectedTeacherForWeekly || getSavedItem('sungdong_weekly_teacher', '') || getSavedItem('sungdong_teacher', '');
      return (
        <MyWeeklyScheduleApp
          team={activeTeam}
          teacher={activeTeacher}
          onNavigateBack={() => setCurrentView('main')}
        />
      );
    }

    if (currentView === 'studentSearch') {
      return <StudentSearchApp onNavigateBack={() => setCurrentView('main')} />;
    }

    if (currentView === 'teacherManagement') {
      return <TeacherManagementApp onNavigateBack={() => setCurrentView('main')} />;
    }

    if (currentView === 'autoSchedule') {
      return <AutoScheduleApp onNavigateBack={() => setCurrentView('main')} />;
    }

    if (currentView === 'holidayManagement') {
      return <HolidayManagementApp onNavigateBack={() => setCurrentView('main')} />;
    }

    if (currentView === 'nangmanStudio') {
      return (
        <NangmanStudioApp
          onNavigateBack={() => setCurrentView('main')}
          onNavigateToClassroom={() => setCurrentView('classroom')}
        />
      );
    }

    if (currentView === 'noticeManagement') {
      return <NoticeManagementApp onNavigateBack={() => setCurrentView('main')} initialNotice={selectedNoticeForView} />;
    }

    if (currentView === 'studentFormsAdmin') {
      return (
        <StudentFormsAdminApp
          onNavigateBack={() => setCurrentView('main')}
          initialTeacher={selectedFormsTeacher || getSavedItem('sungdong_teacher', '')}
          initialTeam={selectedFormsTeam || getSavedItem('sungdong_team', '')}
          isAdminMode={isFormsAdminMode}
        />
      );
    }

    return (
      <MainApp
        onNavigateToClassroom={() => setCurrentView('classroom')}
        onNavigateToDailySchedule={(team) => {
          setSelectedTeamForSchedule(team);
          try {
            window.sessionStorage.removeItem('sungdong_daily_schedule_date');
          } catch (e) {}
          setCurrentView('dailySchedule');
        }}
        onNavigateToMyWeeklySchedule={() => {
          const t = getSavedItem('sungdong_team', '') || selectedTeamForSchedule;
          const th = getSavedItem('sungdong_teacher', '') || selectedTeacherForWeekly;
          setSelectedTeamForSchedule(t);
          setSelectedTeacherForWeekly(th);
          if (t) setSavedItem('sungdong_schedule_team', t);
          if (th) setSavedItem('sungdong_weekly_teacher', th);
          setCurrentView('myWeeklySchedule');
        }}
        onNavigateToStudentSearch={() => setCurrentView('studentSearch')}
        onNavigateToStudentFormsAdmin={(options = {}) => {
          const t = options.team || getSavedItem('sungdong_team', '');
          const th = options.teacher || getSavedItem('sungdong_teacher', '');
          setSelectedFormsTeam(t);
          setSelectedFormsTeacher(th);
          setIsFormsAdminMode(!!options.isAdminMode);
          setCurrentView('studentFormsAdmin');
        }}
        onNavigateToTeamSchedule={(team) => {
          setSelectedTeamForSchedule(team);
          setCurrentView('teamSchedule');
        }}
        onNavigateToTeacherManagement={() => setCurrentView('teacherManagement')}
        onNavigateToAutoSchedule={() => setCurrentView('autoSchedule')}
        onNavigateToHolidayManagement={() => setCurrentView('holidayManagement')}
        onNavigateToNangmanStudio={() => setCurrentView('nangmanStudio')}
        onNavigateToNoticeManagement={(notice = null) => {
          setSelectedNoticeForView(notice);
          setCurrentView('noticeManagement');
        }}
      />
    );
  };

  return (
    <Suspense fallback={<LoadingFallback />}>
      {renderView()}
    </Suspense>
  );
}
