import React from 'react'

const SettingsSidebar = () => {
  return (
    <aside className="settings-sidebar">
        <h2>Settings</h2>
        <div className="settings-nav">
          <h3>Account Settings</h3>
          {sections.filter(s => s.group === 'Account Settings').map(s => (
            <button
              key={s.id}
              className={`settings-nav-item${activeSection === s.id ? ' active' : ''}`}
              data-section={s.id}
              onClick={() => setActiveSection(s.id)}
            >
              <i className={s.icon}></i> {s.label}
            </button>
          ))}
          <h3>Application Settings</h3>
          {sections.filter(s => s.group === 'Application Settings').map(s => (
            <button
              key={s.id}
              className={`settings-nav-item${activeSection === s.id ? ' active' : ''}`}
              data-section={s.id}
              onClick={() => setActiveSection(s.id)}
            >
              <i className={s.icon}></i> {s.label}
            </button>
          ))}
          <h3 className="warning-zone">Warning Zone</h3>
          {sections.filter(s => s.group === 'Warning Zone').map(s => (
            <button
              key={s.id}
              className={`settings-nav-item${s.warning ? ' warning' : ''}${s.danger ? ' danger' : ''}${activeSection === s.id ? ' active' : ''}`}
              data-section={s.id}
              onClick={() => setActiveSection(s.id)}
            >
              <i className={s.icon}></i> {s.label}
            </button>
          ))}
        </div>
      </aside>
  )
}

export default SettingsSidebar