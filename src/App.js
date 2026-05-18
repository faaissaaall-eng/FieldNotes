// ─────────────────────────────────────────────────────────────────────────────
// App.js — Root App component + ReactDOM.createRoot() bootstrap
// ─────────────────────────────────────────────────────────────────────────────
const { useState: useStateApp, useEffect: useEffectApp } = React;

function App() {
  // Restore projects from localStorage, or load seed data
  const [projects, setProjects] = useStateApp(() => loadData() || SEED_PROJECTS);

  // Screen routing
  const [screen,          setScreen]  = useStateApp('home');
  const [activeProjectId, setActiveProjectId] = useStateApp(null);
  const [activeVisitId,   setActiveVisitId]   = useStateApp(null);
  const [showNewProject,  setShowNewProject]  = useStateApp(false);

  // Dark mode
  const [isDark, setIsDark] = useStateApp(() => {
    try { return localStorage.getItem(THEME_KEY) === 'dark'; } catch { return false; }
  });

  // OneDrive hook
  const od = useOneDrive();

  // Derived
  const activeProject = projects.find(p => p.id === activeProjectId) || null;
  const activeVisit   = activeProject?.visits.find(v => v.id === activeVisitId) || null;

  // Persist on every projects change
  useEffectApp(() => { saveData(projects); }, [projects]);

  // Update photo OD URLs across all projects when a photo uploads
  useEffectApp(() => {
    const handler = e => {
      const { obsId, url } = e.detail;
      setProjects(prev => prev.map(proj => ({
        ...proj,
        visits: proj.visits.map(visit => ({
          ...visit,
          observations: visit.observations.map(o =>
            o.photoIdbKey === obsId ? { ...o, photoODUrl: url } : o
          ),
        })),
      })));
    };
    window.addEventListener('od-photo-uploaded', handler);
    return () => window.removeEventListener('od-photo-uploaded', handler);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    applyTheme(next);
  }

  function openProject(projId) {
    setActiveProjectId(projId);
    setScreen('project');
  }

  function openVisit(projId, visitId) {
    setActiveProjectId(projId);
    setActiveVisitId(visitId || null);
    setScreen(visitId ? 'visit' : 'setup');
  }

  function openSetup(projId) {
    setActiveProjectId(projId);
    setActiveVisitId(null);
    setScreen('setup');
  }

  function saveVisit(updatedVisit) {
    setProjects(prev => prev.map(proj =>
      proj.id !== activeProjectId ? proj : {
        ...proj,
        visits: proj.visits.map(v => v.id === updatedVisit.id ? updatedVisit : v),
      }
    ));
  }

  function updateProject(updatedProj) {
    setProjects(prev => prev.map(p => p.id === updatedProj.id ? updatedProj : p));
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return h(React.Fragment, null,

    // ── Home screen ──────────────────────────────────────────────────────────
    screen === 'home' && h(HomeScreen, {
      projects,
      onOpenProject: projId => openProject(projId),
      onNewProject:  () => setShowNewProject(true),
      onOpenVisit:   (projId, visitId) => openVisit(projId, visitId),
      onNewVisit:    projId => openSetup(projId),
      dark: isDark, toggleTheme, od,
    }),

    // ── Project management view ───────────────────────────────────────────────
    screen === 'project' && activeProject && h(ProjectView, {
      proj: activeProject,
      onBack:          () => setScreen('home'),
      onOpenVisit:     visitId => openVisit(activeProjectId, visitId),
      onNewVisit:      () => openSetup(activeProjectId),
      onUpdateProject: updateProject,
      dark: isDark, toggleTheme,
    }),

    // ── New visit setup wizard ────────────────────────────────────────────────
    screen === 'setup' && activeProject && h(NewVisitSetup, {
      proj: activeProject,
      onBack: () => setScreen('home'),
      onComplete: ({ info, drawings }) => {
        const newVisit = {
          id: uid(), ...info, status:'in-progress',
          obsCount:0, critCount:0, sharedWith:[], observations:[],
          drawings, contacts:[],
        };
        setProjects(prev => prev.map(p =>
          p.id !== activeProjectId ? p : {
            ...p,
            visits: [newVisit, ...p.visits],
          }
        ));
        setActiveVisitId(newVisit.id);
        setScreen('visit');
      },
    }),

    // ── Observation tool ──────────────────────────────────────────────────────
    screen === 'visit' && activeProject && activeVisit && h(ObservationTool, {
      proj: activeProject,
      visit: activeVisit,
      onBack:      () => { setScreen('project'); setActiveVisitId(null); },
      onSaveVisit: saveVisit,
      dark: isDark, toggleTheme, od,
    }),

    // ── New project modal ─────────────────────────────────────────────────────
    showNewProject && h(NewProjectSheet, {
      onClose:  () => setShowNewProject(false),
      onCreate: newProj => {
        setProjects(prev => [newProj, ...prev]);
        setShowNewProject(false);
      },
    }),
  );
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(App, null)
);
