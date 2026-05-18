// ─────────────────────────────────────────────────────────────────────────────
// HomeScreen.js — Three-panel home dashboard
//   Left sidebar: project list + quick filters + OneDrive status
//   Main: selected project header, emergent findings, visit cards
//   Right rail: team, activity feed, deadline
// ─────────────────────────────────────────────────────────────────────────────
const { useState: useStateHS, useContext: useContextHS } = React;

// ── Avatar colour map (initials → colour) ─────────────────────────────────────
const AVATAR_COLORS = {
  AH: '#5B4DAB', MF: '#A6492E', SC: '#2F6E5C',
  TB: '#1a6b8a', default: '#374151',
};
function avatarColor(initials) { return AVATAR_COLORS[initials] || AVATAR_COLORS.default; }

// ── HomeProjRow — sidebar project button ──────────────────────────────────────
function HomeProjRow({ proj, active, onClick }) {
  const { T } = useContextHS(window.FNThemeContext);
  const critCount = proj.visits.reduce((n, v) => n + (v.critCount || 0), 0);
  // Derive short code from project name
  const code = proj.id.toUpperCase().replace('PROJ-', 'P-');
  return h('button', {
    onClick,
    style: {
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
      width: '100%', padding: '9px 10px', borderRadius: 0, marginBottom: 2,
      background: active ? T.surface : 'transparent',
      border: active ? `1px solid ${T.rule}` : '1px solid transparent',
      gap: 3, cursor: 'pointer', textAlign: 'left',
    },
  },
    h('div', { style: { display: 'flex', alignItems: 'center', width: '100%', gap: 8 } },
      h('span', {
        style: {
          fontFamily: FS_FONT_MONO, fontSize: 10, fontWeight: 600,
          color: T.muted, letterSpacing: '0.06em', flex: 1,
        },
      }, proj.type ? proj.type.split(' ')[0].toUpperCase().slice(0, 10) : code),
      critCount > 0 && h('span', {
        style: {
          fontFamily: FS_FONT_MONO, fontSize: 10, fontWeight: 700,
          color: T.red, background: T.redSoft, padding: '1px 5px',
        },
      }, `${critCount}!`),
    ),
    h('div', { style: { fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.3 } }, proj.name),
  );
}

// ── HomeEmergentBanner — one critical finding row ─────────────────────────────
function HomeEmergentBanner({ obs, resolved, onResolve, onOpen }) {
  const { T } = useContextHS(window.FNThemeContext);
  const accent = resolved ? T.green : T.red;
  const soft   = resolved ? T.greenSoft : T.redSoft;
  return h('div', {
    style: {
      borderLeft: `3px solid ${accent}`,
      border: `1px solid ${soft}`, borderLeftWidth: 3,
      padding: '11px 14px', background: T.surface,
      display: 'flex', alignItems: 'center', gap: 12,
      opacity: resolved ? 0.6 : 1, transition: 'opacity 0.2s',
      marginBottom: 4,
    },
  },
    h(SeverityPill, { level: resolved ? 'resolved' : 'emergent' }),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', {
        style: {
          fontSize: 13, fontWeight: 600, marginBottom: 2, lineHeight: 1.35, color: T.ink,
          textDecoration: resolved ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        },
      }, obs.note),
      h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.4 } },
        `${obs.category || 'General'} · ${obs.time || ''}`
      ),
    ),
    !resolved && h('button', {
      onClick: onOpen,
      style: {
        padding: '6px 12px', background: T.red, color: '#fff',
        border: 'none', fontSize: 12, fontWeight: 700,
        fontFamily: FS_FONT_UI, cursor: 'pointer', flexShrink: 0,
      },
    }, 'Open'),
    !resolved && h('button', {
      onClick: onResolve,
      style: {
        padding: '6px 12px', background: T.surface,
        color: T.red, border: `1px solid ${T.red}`,
        fontSize: 12, fontWeight: 700,
        fontFamily: FS_FONT_UI, cursor: 'pointer', flexShrink: 0,
      },
    }, 'Resolve'),
  );
}

// ── HomeVisitCard — one visit row in the main panel ──────────────────────────
function HomeVisitCard({ visit, onClick }) {
  const { T } = useContextHS(window.FNThemeContext);
  const [hover, setHover] = useStateHS(false);
  const crew = (visit.sharedWith || []).map(id => {
    // Try to find initials from contacts or use the id
    const parts = id.split('-');
    return parts[parts.length - 1].toUpperCase().slice(0, 2);
  });
  const crit = (visit.critCount || 0) > 0;

  return h('button', {
    onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex', alignItems: 'stretch', width: '100%',
      background: hover ? T.paperAlt : T.surface,
      border: `1px solid ${T.rule}`,
      marginBottom: 6, overflow: 'hidden', textAlign: 'left',
      cursor: 'pointer', transition: 'background 0.15s',
    },
  },
    // Date / time / weather column
    h('div', {
      style: {
        width: 140, padding: '14px 16px', borderRight: `1px solid ${T.rule}`,
        background: T.paperAlt, flexShrink: 0,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3,
      },
    },
      h('div', {
        style: { fontFamily: FS_FONT_MONO, fontSize: 13, fontWeight: 700, color: T.ink, letterSpacing: '0.02em' },
      }, visit.date),
      h('div', { style: { fontFamily: FS_FONT_MONO, fontSize: 12, color: T.muted } }, visit.time || ''),
      h('div', { style: { fontSize: 12, color: T.muted, marginTop: 1 } }, visit.weather || ''),
    ),
    // Focus / purpose column
    h('div', {
      style: { flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 },
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' } },
        crit && h(SeverityPill, { level: 'emergent' }),
        h('span', {
          style: { fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3, color: T.ink },
        }, visit.purpose || visit.location || 'Site Visit'),
      ),
      h('div', { style: { fontFamily: FS_FONT_MONO, fontSize: 11, color: T.muted } },
        `${visit.obsCount || 0} obs · ${visit.engineer || ''}`
      ),
    ),
    // Crew column
    crew.length > 0 && h('div', {
      style: {
        padding: '14px 14px', borderLeft: `1px solid ${T.rule}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 72, flexShrink: 0, gap: 4,
      },
    },
      ...crew.slice(0, 3).map((initials, i) =>
        h(FNAvatar, { key: i, initials, color: avatarColor(initials), size: 24 })
      ),
    ),
  );
}

// ── HomeTeamRow ───────────────────────────────────────────────────────────────
function HomeTeamRow({ member, isYou }) {
  const { T } = useContextHS(window.FNThemeContext);
  const initials = member.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const color = avatarColor(initials);
  return h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px' } },
    h(FNAvatar, { initials, color, size: 30 }),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('div', {
        style: { fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, color: T.ink },
      },
        member.name,
        isYou && h('span', {
          style: {
            fontFamily: FS_FONT_MONO, fontSize: 9, color: T.primary,
            background: T.primarySoft, padding: '1px 4px', fontWeight: 700,
          },
        }, 'YOU'),
      ),
      h('div', { style: { fontSize: 11, color: T.muted } }, member.role),
    ),
  );
}

// ── HomeScreen — main three-panel layout ──────────────────────────────────────
function HomeScreen({ projects, onOpenProject, onNewProject, onOpenVisit, onNewVisit, dark, toggleTheme, od }) {
  const T = dark ? DARK_TOKENS : LIGHT_TOKENS;
  const S = makeFNStyles(T, dark);
  const ctx = { T, S, isDark: dark };

  const [activeProjId, setActiveProjId] = useStateHS(projects[0]?.id || null);
  const [resolved, setResolved]         = useStateHS({});
  const [hoveredFAB, setHoveredFAB]     = useStateHS(false);
  const [hoveredNewProj, setHoveredNewProj] = useStateHS(false);

  const activeProj = projects.find(p => p.id === activeProjId) || projects[0] || null;

  // Collect all critical observations across the active project's visits
  const criticalObs = activeProj
    ? activeProj.visits.flatMap(v =>
        v.observations
          .filter(o => o.severity === 'critical')
          .map(o => ({ ...o, visitId: v.id }))
      )
    : [];
  const unresolvedCount = criticalObs.filter(o => !resolved[o.id]).length;

  // Activity rows derived from real visits (most recent first)
  const activityRows = activeProj
    ? activeProj.visits
        .slice()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 8)
        .map(v => ({
          when: v.date,
          who:  v.engineer ? v.engineer.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '—',
          text: `${v.purpose || 'Site visit'} · ${v.obsCount || 0} obs`,
        }))
    : [];

  return h(FNThemeContext.Provider, { value: ctx },
    h('div', { style: S.paper },

      // ── Top bar ────────────────────────────────────────────────────────────
      h('div', {
        style: {
          display: 'flex', alignItems: 'center', gap: 16, padding: '0 24px',
          height: 52, flexShrink: 0,
          background: dark ? 'rgba(19,19,19,0.94)' : 'rgba(248,249,250,0.94)',
          borderBottom: `1px solid ${T.rule}`,
          backdropFilter: 'saturate(180%) blur(20px)',
        },
      },
        h(FSLogo, { size: 30 }),
        h(FNWordmark, { size: 17, T }),
        h('div', { style: { ...S.caption, marginLeft: 4 } }, 'FIELD OBSERVATIONS'),
        h('div', { style: { flex: 1 } }),

        // Sync status
        od?.signedIn
          ? h('div', {
              style: {
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                background: T.greenSoft, color: T.green,
                fontFamily: FS_FONT_MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
              },
            },
              h(StatusDot, { color: T.green, size: 7 }),
              od.syncing ? 'SYNCING…' : 'SYNCED',
            )
          : h('div', {
              style: {
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                background: T.amberSoft, color: T.amber,
                fontFamily: FS_FONT_MONO, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
              },
            },
              h(StatusDot, { color: T.amber, size: 7 }),
              'LOCAL ONLY',
            ),

        // Theme toggle
        h('button', {
          onClick: toggleTheme,
          style: {
            width: 34, height: 34, border: `1px solid ${T.rule}`,
            background: T.surface, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, color: T.ink2,
          },
        }, dark ? '☀' : '☾'),

        // Current user avatar
        h(FNAvatar, { initials: 'AH', color: '#5B4DAB', size: 32 }),
      ),

      // ── Body ───────────────────────────────────────────────────────────────
      h('div', { style: { flex: 1, display: 'flex', minHeight: 0 } },

        // ── Left sidebar ───────────────────────────────────────────────────
        h('div', {
          style: {
            width: 240, borderRight: `1px solid ${T.rule}`, padding: '18px 14px',
            display: 'flex', flexDirection: 'column', gap: 18, flexShrink: 0,
            background: T.paperAlt, overflowY: 'auto',
          },
          className: 'scroll',
        },
          // Projects section
          h('div', null,
            h('div', {
              style: { display: 'flex', alignItems: 'center', padding: '0 6px 8px' },
            },
              h('div', { style: S.caption }, `PROJECTS · ${projects.length}`),
              h('div', { style: { flex: 1 } }),
              h('button', {
                onMouseEnter: () => setHoveredNewProj(true),
                onMouseLeave: () => setHoveredNewProj(false),
                onClick: onNewProject,
                style: {
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 7px',
                  background: hoveredNewProj ? T.primarySoft : 'transparent',
                  color: T.primary, fontSize: 16, fontWeight: 400,
                  border: 'none', cursor: 'pointer',
                },
              },
                '+',
                hoveredNewProj && h('span', {
                  style: { fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', fontFamily: FS_FONT_UI },
                }, 'New Project'),
              ),
            ),
            ...projects.map(proj =>
              h(HomeProjRow, {
                key: proj.id,
                proj,
                active: proj.id === activeProjId,
                onClick: () => setActiveProjId(proj.id),
              })
            ),
          ),

          // Quick filters
          h('div', null,
            h('div', { style: { ...S.caption, padding: '0 6px 8px' } }, 'QUICK FILTERS'),
            ...[
              { l: 'Open critical',       n: criticalObs.filter(o => !resolved[o.id]).length, c: T.red   },
              { l: 'In progress',         n: projects.flatMap(p => p.visits).filter(v => v.status === 'in-progress').length, c: T.amber  },
              { l: 'This project visits', n: activeProj?.visits.length || 0, c: T.primary },
              { l: 'Total projects',      n: projects.length, c: T.muted   },
            ].map(f =>
              h('div', {
                key: f.l,
                style: { display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', fontSize: 13, color: T.ink2 },
              },
                h(StatusDot, { color: f.c, size: 7 }),
                h('span', { style: { flex: 1 } }, f.l),
                h('span', { style: { ...S.mono, fontSize: 12, color: T.muted } }, f.n),
              )
            ),
          ),

          h('div', { style: { flex: 1 } }),

          // OneDrive status block
          h('div', {
            style: { padding: 12, background: T.surface, border: `1px solid ${T.rule}` },
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              h(StatusDot, { color: od?.signedIn ? T.green : T.muted, size: 7 }),
              h('span', { style: { fontSize: 12, fontWeight: 600, color: T.ink } }, 'OneDrive'),
            ),
            h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.4, marginBottom: 8 } },
              od?.signedIn
                ? `${od.pending || 0} pending · synced to cloud`
                : 'Not signed in — data saved locally',
            ),
            h('button', {
              onClick: od?.signedIn ? od.triggerSync : od?.signIn,
              style: {
                width: '100%', height: 28, background: T.primarySoft, color: T.primary,
                fontSize: 12, fontWeight: 600, fontFamily: FS_FONT_UI,
                border: 'none', cursor: 'pointer',
              },
            }, od?.signedIn ? 'Manage sync' : 'Sign in to OneDrive'),
          ),
        ),

        // ── Main content ───────────────────────────────────────────────────
        h('div', {
          style: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minWidth: 0 },
        },
          h('div', {
            className: 'scroll',
            style: { flex: 1, overflowY: 'auto', padding: '28px 32px 100px', display: 'flex', flexDirection: 'column', gap: 24 },
          },

            activeProj
              ? h(React.Fragment, null,
                  // Project header
                  h('div', null,
                    h('div', { style: { ...S.caption, color: T.primary } },
                      activeProj.type ? activeProj.type.toUpperCase() : 'PROJECT'
                    ),
                    h('div', {
                      style: { display: 'flex', alignItems: 'flex-end', gap: 12, marginTop: 6, flexWrap: 'wrap' },
                    },
                      h('h1', {
                        style: {
                          fontFamily: FS_FONT_SERIF, fontSize: 30, fontWeight: 700,
                          letterSpacing: '-0.022em', lineHeight: 1.1, margin: 0, color: T.ink,
                        },
                      }, activeProj.name),
                      h('div', { style: { flex: 1 } }),
                      h('button', {
                        onClick: () => onOpenProject(activeProj.id),
                        style: {
                          height: 36, padding: '0 16px',
                          border: `2px solid ${T.ink2}`, background: 'transparent',
                          fontSize: 13, fontWeight: 600, color: T.ink2, cursor: 'pointer',
                          fontFamily: FS_FONT_UI,
                        },
                      }, 'Manage'),
                      h('button', {
                        onClick: () => onNewVisit(activeProj.id),
                        style: {
                          height: 36, padding: '0 18px', border: 'none',
                          background: T.primary, color: '#fff',
                          fontSize: 13, fontWeight: 700,
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          cursor: 'pointer', fontFamily: FS_FONT_UI, letterSpacing: '0.01em',
                        },
                      },
                        h('span', { style: { fontSize: 16, fontWeight: 300 } }, '＋'),
                        'New site visit',
                      ),
                    ),
                    h('div', {
                      style: { display: 'flex', flexWrap: 'wrap', gap: '4px 14px', color: T.muted, fontSize: 13, marginTop: 8 },
                    },
                      h('span', { style: { color: T.ink2, fontWeight: 600 } }, activeProj.client || ''),
                      activeProj.client && h('span', null, '·'),
                      h('span', null, activeProj.location || ''),
                    ),
                  ),

                  // Emergent findings
                  criticalObs.length > 0 && h('div', null,
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
                      h('div', { style: S.caption }, 'EMERGENT FINDINGS'),
                      unresolvedCount > 0 && h('span', {
                        style: {
                          fontFamily: FS_FONT_MONO, fontSize: 10, fontWeight: 700,
                          color: T.red, background: T.redSoft, padding: '1px 6px',
                        },
                      }, unresolvedCount),
                    ),
                    h('div', {
                      className: 'scroll',
                      style: { display: 'flex', flexDirection: 'column', maxHeight: 180, overflowY: 'auto' },
                    },
                      ...criticalObs
                        .slice()
                        .sort((a, b) => (resolved[a.id] ? 1 : 0) - (resolved[b.id] ? 1 : 0))
                        .map(obs =>
                          h(HomeEmergentBanner, {
                            key: obs.id,
                            obs,
                            resolved: !!resolved[obs.id],
                            onResolve: () => setResolved(prev => ({ ...prev, [obs.id]: true })),
                            onOpen: () => onOpenVisit(activeProj.id, obs.visitId),
                          })
                        ),
                    ),
                  ),

                  // Site visits
                  h('div', null,
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 } },
                      h('h2', {
                        style: {
                          fontFamily: FS_FONT_SERIF, fontSize: 20, fontWeight: 700,
                          margin: 0, letterSpacing: '-0.01em', color: T.ink,
                        },
                      }, 'Site Visits'),
                      h('span', { style: { ...S.caption, color: T.muted } },
                        `${activeProj.visits.length} TOTAL`
                      ),
                    ),
                    h('div', { className: 'scroll', style: { overflowY: 'auto' } },
                      activeProj.visits.length === 0
                        ? h('div', {
                            style: {
                              padding: '40px 20px', textAlign: 'center', color: T.muted,
                              border: `1px dashed ${T.rule}`, fontSize: 14,
                            },
                          }, 'No visits yet — start one with the button above')
                        : activeProj.visits.map(visit =>
                            h(HomeVisitCard, {
                              key: visit.id,
                              visit,
                              onClick: () => onOpenVisit(activeProj.id, visit.id),
                            })
                          ),
                    ),
                  ),
                )
              : h('div', {
                  style: {
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 12, color: T.muted, padding: 40,
                  },
                },
                  h('div', { style: { fontSize: 48, opacity: 0.3 } }, '📋'),
                  h('div', { style: { fontSize: 17, fontWeight: 600, color: T.ink } }, 'No projects yet'),
                  h('div', { style: { fontSize: 14 } }, 'Create your first project to get started'),
                  h('button', {
                    onClick: onNewProject,
                    style: {
                      marginTop: 16, padding: '10px 24px', background: T.primary, color: '#fff',
                      border: 'none', fontFamily: FS_FONT_UI, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    },
                  }, '+ New Project'),
                ),
          ),

          // FAB — New site visit
          activeProj && h('button', {
            onMouseEnter: () => setHoveredFAB(true),
            onMouseLeave: () => setHoveredFAB(false),
            onClick: () => onNewVisit(activeProj.id),
            style: {
              position: 'absolute', bottom: 28, right: 28, zIndex: 10,
              height: 48, padding: '0 20px',
              border: 'none', cursor: 'pointer',
              background: T.primary, color: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              fontFamily: FS_FONT_UI, fontWeight: 700, letterSpacing: '0.01em',
              transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)', whiteSpace: 'nowrap',
            },
          },
            h('span', { style: { fontSize: 20, fontWeight: 300, lineHeight: 1 } }, '＋'),
            hoveredFAB && h('span', { style: { fontSize: 13 } }, 'New Site Visit'),
          ),
        ),

        // ── Right rail ─────────────────────────────────────────────────────
        activeProj && h('div', {
          className: 'scroll',
          style: {
            width: 268, borderLeft: `1px solid ${T.rule}`, padding: 18, flexShrink: 0,
            display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto',
            background: T.paperAlt,
          },
        },

          // Team
          h('div', null,
            h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 10 } },
              h('div', { style: S.caption }, `TEAM · ${(activeProj.members || []).length}`),
              h('div', { style: { flex: 1 } }),
              h('button', {
                onClick: () => onOpenProject(activeProj.id),
                style: {
                  height: 26, padding: '0 8px', border: `1px solid ${T.rule}`,
                  background: T.surface, fontSize: 11, fontWeight: 600,
                  color: T.muted, cursor: 'pointer', fontFamily: FS_FONT_UI,
                },
              }, 'Manage'),
            ),
            ...(activeProj.members || []).map((m, i) =>
              h(HomeTeamRow, { key: m.id || i, member: m, isYou: i === 0 })
            ),
          ),

          h('div', { style: { height: 1, background: T.rule } }),

          // Activity feed
          h('div', null,
            h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 10 } },
              h('div', { style: S.caption }, 'ACTIVITY'),
            ),
            h('div', { className: 'scroll', style: { maxHeight: 260, overflowY: 'auto' } },
              activityRows.length === 0
                ? h('div', { style: { fontSize: 12, color: T.muted, padding: '8px 0' } }, 'No activity yet')
                : activityRows.map((a, i) =>
                    h('div', {
                      key: i,
                      style: { display: 'flex', gap: 10, padding: '7px 0', borderBottom: `1px solid ${T.rule}` },
                    },
                      h('div', {
                        style: { fontFamily: FS_FONT_MONO, fontSize: 10, color: T.muted, width: 58, flexShrink: 0, paddingTop: 2 },
                      }, a.when),
                      h('div', { style: { flex: 1, fontSize: 12, color: T.ink2, lineHeight: 1.45 } },
                        a.who !== '—' && h('b', { style: { color: T.ink } }, a.who + ' '),
                        a.text,
                      ),
                    )
                  ),
            ),
          ),

          h('div', { style: { height: 1, background: T.rule } }),

          // Project stats
          h('div', null,
            h('div', { style: { ...S.caption, marginBottom: 10 } }, 'PROJECT STATS'),
            ...[
              { label: 'Total visits',      value: activeProj.visits.length },
              { label: 'Total observations',value: activeProj.visits.reduce((n, v) => n + (v.obsCount || 0), 0) },
              { label: 'Critical items',    value: activeProj.visits.reduce((n, v) => n + (v.critCount || 0), 0) },
              { label: 'Status',            value: activeProj.status ? activeProj.status.charAt(0).toUpperCase() + activeProj.status.slice(1) : 'Active' },
            ].map(stat =>
              h('div', {
                key: stat.label,
                style: { display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${T.rule}`, fontSize: 13 },
              },
                h('span', { style: { color: T.muted } }, stat.label),
                h('span', { style: { color: T.ink, fontWeight: 600, fontFamily: FS_FONT_MONO, fontSize: 12 } }, stat.value),
              )
            ),
          ),
        ),
      ),
    ),
  );
}
