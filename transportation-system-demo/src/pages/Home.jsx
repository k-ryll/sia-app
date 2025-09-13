import React, { useContext } from 'react';
import logo2 from '../assets/logo2.svg';
import Navbar from '../components/Navbar';
import ChatButton from '../components/ChatButton';
import { LanguageContext } from '../contexts/LanguageContext';

function Home() {
  const { translations } = useContext(LanguageContext);

  return (
    <>
      <Navbar />

      <main>
        <section className="hero">
          <img src={logo2} alt="gabaylakbay Logo" />
          <h1>{translations['welcome'] || 'Welcome to gabaylakbay'}</h1>
          <p>{translations['tagline'] || 'The #1 travel companion app in the Philippines.'}</p>
          <a href="signup.html" className="cta-button">{translations['signup'] || 'Sign Up'}</a>
        </section>

        <section className="features">
          <div className="feature">
            <i className="fa-solid fa-mobile-screen-button"></i>
            <h2>{translations['support_title'] || '24/7 Support'}</h2>
            <p>{translations['support_desc'] || 'Reach destinations with our transportation system anytime!'}</p>
          </div>
          <div className="feature">
            <i className="fa-solid fa-ticket"></i>
            <h2>{translations['booking_title'] || 'Easy Booking'}</h2>
            <p>{translations['booking_desc'] || 'Commute hassle-free by booking your rides with us!'}</p>
          </div>
          <div className="feature">
            <i className="fa-solid fa-clock"></i>
            <h2>{translations['schedule_title'] || 'Get Real-Time Schedules'}</h2>
            <p>{translations['schedule_desc'] || 'Be notified with the Public Transport schedule real-time!'}</p>
          </div>
        </section>
      </main>
      
      <ChatButton />
    </>
  );
}

export default Home;