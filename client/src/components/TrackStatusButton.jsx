import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Search } from 'lucide-react';

export const TrackStatusButton = forwardRef(({
  onClick,
  onComplete,
  disabled = false,
  defaultText = 'Track Status',
  successText = 'Tracking Live',
  className = '',
  style = {},
}, ref) => {
  const [btnState, setBtnState] = useState('idle'); // 'idle' | 'animating' | 'completed'
  const [showBox, setShowBox] = useState(false);
  const [boxLoaded, setBoxLoaded] = useState(false);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const [lightsOn, setLightsOn] = useState(false);
  const [speeding, setSpeeding] = useState(false);
  const [truckTransform, setTruckTransform] = useState('translateX(270px)');
  const [truckTransition, setTruckTransition] = useState('none');

  const animationTimeoutsRef = useRef([]);

  const clearAllTimeouts = () => {
    animationTimeoutsRef.current.forEach((t) => clearTimeout(t));
    animationTimeoutsRef.current = [];
  };

  useEffect(() => {
    return () => clearAllTimeouts();
  }, []);

  const addTimeout = (fn, delay) => {
    const id = setTimeout(fn, delay);
    animationTimeoutsRef.current.push(id);
    return id;
  };

  const resetAnimation = () => {
    clearAllTimeouts();
    setBtnState('idle');
    setShowBox(false);
    setBoxLoaded(false);
    setDoorsOpen(false);
    setLightsOn(false);
    setSpeeding(false);
    setTruckTransition('none');
    setTruckTransform('translateX(270px)');
  };

  const triggerAnimation = () => {
    if (btnState === 'animating') return;
    clearAllTimeouts();

    // Step 1: Click -> Button depresses, "Track Status" slides up, Box drops in
    setBtnState('animating');
    setShowBox(true);
    setBoxLoaded(false);
    setDoorsOpen(false);
    setLightsOn(false);
    setSpeeding(false);
    setTruckTransition('none');
    setTruckTransform('translateX(270px)');

    // Step 2: Truck drives in from the right to center-right
    addTimeout(() => {
      setTruckTransition('transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)');
      setTruckTransform('translateX(88px)');
    }, 250);

    // Step 3: Rear doors swing open wide (\ /)
    addTimeout(() => {
      setDoorsOpen(true);
    }, 750);

    // Step 4: Truck reverses over package
    addTimeout(() => {
      setTruckTransition('transform 0.75s cubic-bezier(0.4, 0, 0.2, 1)');
      setTruckTransform('translateX(32px)');
    }, 1100);

    // Box loads into truck
    addTimeout(() => {
      setBoxLoaded(true);
    }, 1450);

    // Step 5: Rear doors close flush
    addTimeout(() => {
      setDoorsOpen(false);
    }, 1850);

    // Step 6: Headlights on & drive out fast
    addTimeout(() => {
      setLightsOn(true);
      setSpeeding(true);
      setTruckTransition('transform 1.3s cubic-bezier(0.2, 0, 0.4, 1)');
      setTruckTransform('translateX(290px)');
    }, 2350);

    // Step 7: Completed state
    addTimeout(() => {
      setShowBox(false);
      setSpeeding(false);
      setLightsOn(false);
      setBtnState('completed');
      if (onComplete) {
        onComplete();
      }
    }, 3650);
  };

  useImperativeHandle(ref, () => ({
    trigger: triggerAnimation,
    reset: resetAnimation,
  }));

  const handleClick = (e) => {
    if (btnState === 'animating') return;
    if (btnState === 'completed') {
      resetAnimation();
    }
    if (onClick) {
      onClick(e, triggerAnimation);
    } else {
      triggerAnimation();
    }
  };

  const btnClasses = [
    'order-btn',
    btnState === 'animating' ? 'animating' : '',
    showBox ? 'show-box' : '',
    boxLoaded ? 'box-loaded' : '',
    speeding ? 'speeding' : '',
    btnState === 'completed' ? 'completed' : '',
    className,
  ].filter(Boolean).join(' ');

  const truckClasses = [
    'truck-wrapper',
    doorsOpen ? 'doors-open' : '',
    lightsOn ? 'lights-on' : '',
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={btnClasses}
      onClick={handleClick}
      disabled={disabled || btnState === 'animating'}
      style={style}
      aria-label={defaultText}
    >
      {/* Default Text State */}
      <span className="btn-text default-text">
        <Search size={16} />
        <span>{defaultText}</span>
      </span>

      {/* Success Text State */}
      <span className="btn-text success-text">
        <svg
          className="check-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        <span>{successText}</span>
      </span>

      {/* Dashed Road Line */}
      <div className="road-dashed"></div>

      {/* Package SVG */}
      <div className="box-wrapper">
        <svg className="box-svg" viewBox="0 0 26 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="26" height="24" rx="4" fill="#E5A853" />
          <rect x="9.5" width="7" height="24" fill="#C48432" />
          <line x1="0" y1="1" x2="26" y2="1" stroke="#FCE7C8" strokeOpacity="0.6" />
        </svg>
      </div>

      {/* Delivery Truck SVG */}
      <div
        className={truckClasses}
        style={{
          transform: truckTransform,
          transition: truckTransition,
        }}
      >
        <svg className="truck-svg" viewBox="0 0 140 48" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="beamGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FDE047" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#FACC15" stopOpacity="0.45" />
              <stop offset="85%" stopColor="#FACC15" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Light Beams */}
          <g className="light-beams">
            <polygon points="96,7 165,-8 165,24" fill="url(#beamGlow)" />
            <polygon points="96,41 165,24 165,56" fill="url(#beamGlow)" />
            <polygon points="96,24 175,10 175,38" fill="url(#beamGlow)" opacity="0.5" />
          </g>

          {/* Side Mirrors */}
          <line x1="72" y1="4" x2="65" y2="-1" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="72" y1="44" x2="65" y2="49" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />

          {/* Rear Doors */}
          <g className="truck-doors">
            <line className="door-top" x1="16" y1="4" x2="16" y2="24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
            <line className="door-bottom" x1="16" y1="44" x2="16" y2="24" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
          </g>

          {/* Cargo Container Body */}
          <rect x="16" y="4" width="56" height="40" rx="4" fill="#FFFFFF" />
          <line x1="62" y1="4" x2="62" y2="44" stroke="#E2E8F0" strokeWidth="1.5" />

          {/* Cab */}
          <path d="M72 4 H88 C94 4 98 9 98 24 C98 39 94 44 88 44 H72 V4 Z" fill="#2563EB" />

          {/* Windshield */}
          <path d="M76 7 H86 C89.5 7 92 11 92 24 C92 37 89.5 41 86 41 H76 V7 Z" fill="#0F172A" />
          <line x1="79" y1="10" x2="89" y2="20" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" />

          {/* Headlights */}
          <rect className="headlight-top" x="94" y="6" width="4" height="7" rx="1.5" fill="#FACCB1" />
          <rect className="headlight-bottom" x="94" y="35" width="4" height="7" rx="1.5" fill="#FACCB1" />
        </svg>
      </div>
    </button>
  );
});
