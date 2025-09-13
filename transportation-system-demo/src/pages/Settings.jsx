import React, { useState, useContext } from 'react';
import Navbar from '../components/Navbar';
import ChatButton from '../components/ChatButton';
import { LanguageContext } from '../contexts/LanguageContext';

const sections = [
  { id: 'edit-profile', labelKey: 'edit_profile', icon: 'fa-regular fa-user', group: 'Account Settings' },
  { id: 'change-password', labelKey: 'change_password', icon: 'fa-solid fa-lock', group: 'Account Settings' },
  { id: 'privacy-security', labelKey: 'privacy_security', icon: 'fa-solid fa-shield', group: 'Account Settings' },
  { id: 'accessibility', labelKey: 'accessibility', icon: 'fa-solid fa-universal-access', group: 'Application Settings' },
  { id: 'display', labelKey: 'display', icon: 'fa-solid fa-palette', group: 'Application Settings' },
  { id: 'language', labelKey: 'language', icon: 'fa-solid fa-language', group: 'Application Settings' },
  { id: 'disable-account', labelKey: 'disable_account', icon: 'fa-solid fa-user-slash', group: 'Warning Zone', warning: true },
  { id: 'delete-account', labelKey: 'delete_account', icon: 'fa-solid fa-trash', group: 'Warning Zone', danger: true },
  { id: 'sign-out', labelKey: 'sign_out', icon: 'fa-solid fa-right-from-bracket', group: 'Warning Zone' },
];

const languageOptions = [
  
  { code: 'en', name: 'English (US)', native: 'English (US)' },
  { code: 'tl', name: 'Tagalog', native: 'Pilipino' },
  { code: 'ceb', name: 'Bisaya', native: 'Cebuano' },
  { code: 'ilo', name: 'Ilocano', native: 'Ilocano' },
  { code: 'pag', name: 'Pangasinan', native: 'Pangasinan' } ,
  { code: 'ko', name: '한국어', native: 'Korean' },
  { code: 'ja', name: '日本語', native: 'Japanese' },
  { code: 'zh', name: '中文(简体)', native: 'Simplified Chinese' }
];

function Settings() {
  const { language, setLanguage, translations } = useContext(LanguageContext);
  const [activeSection, setActiveSection] = useState('edit-profile');
  const [selectedLanguage, setSelectedLanguage] = useState(language);

  const handleLanguageSelect = (langCode) => {
    setSelectedLanguage(langCode);
    setLanguage(langCode);
  };

  return (
    <>
      <Navbar />
      <main className="settings-container">
        <aside className="settings-sidebar">
          <h2>{translations['settings'] || 'Settings'}</h2>
          <div className="settings-nav">
            <h3>{translations['account_settings'] || 'Account Settings'}</h3>
            {sections.filter(s => s.group === 'Account Settings').map(s => (
              <button
                key={s.id}
                className={`settings-nav-item${activeSection === s.id ? ' active' : ''}`}
                data-section={s.id}
                onClick={() => setActiveSection(s.id)}
              >
                <i className={s.icon}></i> {translations[s.labelKey] || s.labelKey}
              </button>
            ))}
            <h3>{translations['application_settings'] || 'Application Settings'}</h3>
            {sections.filter(s => s.group === 'Application Settings').map(s => (
              <button
                key={s.id}
                className={`settings-nav-item${activeSection === s.id ? ' active' : ''}`}
                data-section={s.id}
                onClick={() => setActiveSection(s.id)}
              >
                <i className={s.icon}></i> {translations[s.labelKey] || s.labelKey}
              </button>
            ))}
            <h3 className="warning-zone">{translations['warning_zone'] || 'Warning Zone'}</h3>
            {sections.filter(s => s.group === 'Warning Zone').map(s => (
              <button
                key={s.id}
                className={`settings-nav-item${s.warning ? ' warning' : ''}${s.danger ? ' danger' : ''}${activeSection === s.id ? ' active' : ''}`}
                data-section={s.id}
                onClick={() => setActiveSection(s.id)}
              >
                <i className={s.icon}></i> {translations[s.labelKey] || s.labelKey}
              </button>
            ))}
          </div>
        </aside>

        <div className="settings-content">
          {/* Edit Profile Section */}
          <section id="edit-profile" className={`settings-section${activeSection === 'edit-profile' ? ' active' : ''}`}>
            <h2>{translations['edit_profile'] || 'Edit Profile'}</h2>
            <form className="settings-form">
              <div className="form-group">
                <label htmlFor="fullName">{translations['full_name'] || 'Full Name'}</label>
                <input type="text" id="fullName" name="fullName" placeholder={translations['full_name'] || 'Full Name'} />
              </div>
              <div className="form-group">
                <label htmlFor="email">{translations['email'] || 'Email'}</label>
                <input type="email" id="email" name="email" placeholder={translations['email'] || 'Email'} />
              </div>
              <div className="form-group">
                <label htmlFor="phone">{translations['phone'] || 'Phone Number'}</label>
                <input type="tel" id="phone" name="phone" placeholder={translations['phone'] || 'Phone Number'} />
              </div>
              <button type="submit" className="save-button">{translations['save_changes'] || 'Save Changes'}</button>
            </form>
          </section>

          {/* Language Section */}
          <section id="language" className={`settings-section${activeSection === 'language' ? ' active' : ''}`}>
            <h2>{translations['language'] || 'Language'}</h2>
            <div className="language-search">
              <i className="fa-solid fa-magnifying-glass"></i>
              <input type="search" placeholder={translations['search_language'] || 'Search Language'} />
            </div>
            <div className="language-options">
              {languageOptions.map(opt => (
                <div
                  className={`language-option${selectedLanguage === opt.code ? ' selected' : ''}`}
                  key={opt.code}
                  onClick={() => handleLanguageSelect(opt.code)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="language-info">
                    <span className="language-name">{opt.name}</span>
                    <span className="language-native">{opt.native}</span>
                  </span>
                  <i className={`fa-solid fa-check check-icon${selectedLanguage === opt.code ? '' : ' hidden'}`}></i>
                </div>
              ))}
            </div>
            <div className="language-footer">
              <p>{translations['language_not_supported'] || 'Your language not supported?'}</p>
              <a href="mailto:gabaylakbay.app@gmail.com">{translations['email_us'] || 'Email us at gabaylakbay.app@gmail.com'}</a>
            </div>
          </section>

          {/* Change Password Section */}
          <section id="change-password" className={`settings-section${activeSection === 'change-password' ? ' active' : ''}`}>
            <h2>{translations['change_password'] || 'Change Password'}</h2>
            <form className="settings-form">
              <div className="form-group">
                <label htmlFor="currentPassword">{translations['current_password'] || 'Current Password'}</label>
                <input type="password" id="currentPassword" name="currentPassword" placeholder={translations['current_password'] || 'Current Password'} />
              </div>
              <div className="form-group">
                <label htmlFor="newPassword">{translations['new_password'] || 'New Password'}</label>
                <input type="password" id="newPassword" name="newPassword" placeholder={translations['new_password'] || 'New Password'} />
              </div>
              <div className="form-group">
                <label htmlFor="confirmPassword">{translations['confirm_password'] || 'Confirm New Password'}</label>
                <input type="password" id="confirmPassword" name="confirmPassword" placeholder={translations['confirm_password'] || 'Confirm New Password'} />
              </div>
              <button type="submit" className="save-button">{translations['change_password_btn'] || 'Change Password'}</button>
            </form>
          </section>
        </div>
      </main>
      
      <ChatButton />
    </>
  );
}

export default Settings;