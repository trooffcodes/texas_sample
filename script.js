(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('js-loaded');

  /* ==========================================================================
     LENIS SMOOTH SCROLL (SAFE INITIALIZATION)
     ========================================================================== */
  let lenisInstance = null;
  if (!reduceMotion && typeof window.Lenis === 'function') {
    try {
      lenisInstance = new Lenis({
        duration: 1.05,
        smoothWheel: true,
        wheelMultiplier: 0.85,
        touchMultiplier: 1.1
      });

      const raf = time => {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);
      window.lenis = lenisInstance;
    } catch {
      // Graceful fallback
    }
  }

  /* ==========================================================================
     MOBILE DRAWER
     ========================================================================== */
  const menuButton = document.querySelector('.menu-toggle');
  const menuDrawer = document.getElementById('mobile-menu');
  const menuClose = menuDrawer?.querySelector('.menu-close');
  const drawerLinks = menuDrawer?.querySelectorAll('a');

  const openDrawer = () => {
    if (!menuDrawer) return;
    if (typeof menuDrawer.showModal === 'function') {
      menuDrawer.showModal();
    } else {
      menuDrawer.setAttribute('open', '');
    }
    menuButton?.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    lenisInstance?.stop();
  };

  const closeDrawer = () => {
    if (!menuDrawer) return;
    if (typeof menuDrawer.close === 'function') {
      menuDrawer.close();
    } else {
      menuDrawer.removeAttribute('open');
    }
    menuButton?.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    lenisInstance?.start();
  };

  menuButton?.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    if (isOpen) closeDrawer();
    else openDrawer();
  });

  menuClose?.addEventListener('click', closeDrawer);
  menuDrawer?.addEventListener('click', event => {
    if (event.target === menuDrawer) closeDrawer();
  });
  drawerLinks?.forEach(link => link.addEventListener('click', closeDrawer));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      closeDrawer();
    }
  });

  /* ==========================================================================
     COMPARISON SLIDER
     ========================================================================== */
  const comparison = document.getElementById('comparison');
  const handle = document.getElementById('comparison-handle');
  const presets = document.querySelectorAll('.comparison-presets button');

  if (comparison && handle) {
    let currentSplit = 50;

    const setSplit = (percent, updateAria = true) => {
      currentSplit = Math.max(0, Math.min(100, percent));
      comparison.style.setProperty('--split', `${currentSplit}%`);

      if (updateAria) {
        handle.setAttribute('aria-valuenow', String(Math.round(currentSplit)));
        handle.setAttribute('aria-valuetext', `${Math.round(currentSplit)} percent before, ${Math.round(100 - currentSplit)} percent after`);
      }

      presets.forEach(btn => {
        const targetPos = Number(btn.dataset.position);
        btn.setAttribute('aria-pressed', String(Math.abs(targetPos - currentSplit) < 1));
      });
    };

    let isDragging = false;

    const updatePointerPosition = clientX => {
      const rect = comparison.getBoundingClientRect();
      if (!rect.width) return;
      const x = clientX - rect.left;
      const percent = (x / rect.width) * 100;
      setSplit(percent);
    };

    const onPointerDown = event => {
      isDragging = true;
      handle.setPointerCapture(event.pointerId);
      updatePointerPosition(event.clientX);
    };

    const onPointerMove = event => {
      if (!isDragging) return;
      updatePointerPosition(event.clientX);
    };

    const onPointerUp = event => {
      if (!isDragging) return;
      isDragging = false;
      try {
        handle.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer already released
      }
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);

    handle.addEventListener('keydown', event => {
      let delta = 0;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') delta = -3;
      else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') delta = 3;
      else if (event.key === 'PageDown') delta = -15;
      else if (event.key === 'PageUp') delta = 15;
      else if (event.key === 'Home') {
        setSplit(0);
        event.preventDefault();
        return;
      } else if (event.key === 'End') {
        setSplit(100);
        event.preventDefault();
        return;
      }

      if (delta !== 0) {
        event.preventDefault();
        setSplit(currentSplit + delta);
      }
    });

    presets.forEach(button => {
      button.addEventListener('click', () => {
        const pos = Number(button.dataset.position);
        if (!Number.isNaN(pos)) setSplit(pos);
      });
    });
  }

  /* ==========================================================================
     ANIMATED COUNTERS
     ========================================================================== */
  const counterElements = document.querySelectorAll('[data-counter]');

  if (counterElements.length > 0) {
    const animateCounter = el => {
      const target = Number(el.dataset.counter);
      const decimals = Number(el.dataset.decimals || 0);
      if (Number.isNaN(target)) return;

      if (reduceMotion) {
        el.textContent = target.toFixed(decimals);
        return;
      }

      const duration = 1200;
      const startTime = performance.now();

      const step = now => {
        const progress = Math.min((now - startTime) / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = easeOut * target;
        el.textContent = current.toFixed(decimals);

        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(decimals);
      };

      requestAnimationFrame(step);
    };

    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.25 });

    counterElements.forEach(el => counterObserver.observe(el));
  }

  /* ==========================================================================
     REVEAL ANIMATIONS
     ========================================================================== */
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length > 0) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach(el => el.classList.add('is-visible'));
    } else {
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      revealElements.forEach(el => revealObserver.observe(el));
    }
  }

  /* ==========================================================================
     PROPOSAL FORM
     ========================================================================== */
  const form = document.getElementById('proposal-form');
  const formStatus = document.getElementById('form-status');
  const previewSection = document.getElementById('email-preview');
  const previewText = document.getElementById('preview-text');
  const openDraft = document.getElementById('open-draft');
  const copyInquiry = document.getElementById('copy-inquiry');
  const copyStatus = document.getElementById('copy-status');

  const fields = {
    fullName: document.getElementById('full-name'),
    email: document.getElementById('email'),
    location: document.getElementById('location'),
    propertyType: document.getElementById('property-type'),
    scope: document.getElementById('scope'),
    message: document.getElementById('message'),
    consent: document.getElementById('email-consent')
  };

  const validateField = (field, errorId, errorMsg) => {
    const errorEl = document.getElementById(errorId);
    if (!field) return true;

    const isValid = field.type === 'checkbox' ? field.checked : field.checkValidity();

    if (!isValid) {
      field.classList.add('is-invalid');
      if (errorEl) errorEl.textContent = errorMsg || field.validationMessage || 'Please complete this field.';
      return false;
    }

    field.classList.remove('is-invalid');
    if (errorEl) errorEl.textContent = '';
    return true;
  };

  Object.entries(fields).forEach(([key, input]) => {
    if (!input) return;
    const eventType = input.type === 'checkbox' || input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(eventType, () => {
      input.classList.remove('is-invalid');
      const err = document.getElementById(`${input.id}-error`);
      if (err) err.textContent = '';
      if (formStatus) formStatus.textContent = '';
    });
  });

  form?.addEventListener('submit', event => {
    event.preventDefault();

    const isNameValid = validateField(fields.fullName, 'full-name-error', 'Please enter your name.');
    const isEmailValid = validateField(fields.email, 'email-error', 'Please enter a valid email address.');
    const isLocValid = validateField(fields.location, 'location-error', 'Please enter your property location or ZIP.');
    const isTypeValid = validateField(fields.propertyType, 'property-type-error', 'Please select a property type.');
    const isScopeValid = validateField(fields.scope, 'scope-error', 'Please select a primary project scope.');
    const isMsgValid = validateField(fields.message, 'message-error', 'Please provide site details (20–1,800 characters).');
    const isConsentValid = validateField(fields.consent, 'email-consent-error', 'Please acknowledge this email preparation step.');

    if (!isNameValid || !isEmailValid || !isLocValid || !isTypeValid || !isScopeValid || !isMsgValid || !isConsentValid) {
      if (formStatus) {
        formStatus.textContent = 'Please review and resolve the errors above.';
        formStatus.className = 'form-status is-error';
      }
      return;
    }

    const recipient = 'info@txlandscapeservices.com';
    const subject = `Proposal Request: ${fields.propertyType.value} — ${fields.fullName.value}`;
    const inquiryBody = [
      'TEXAS LANDSCAPE SERVICES — PROPOSAL REQUEST',
      '======================================================',
      `Full Name:      ${fields.fullName.value.trim()}`,
      `Email Address:  ${fields.email.value.trim()}`,
      `Location / ZIP: ${fields.location.value.trim()}`,
      `Property Type:  ${fields.propertyType.value}`,
      `Primary Scope:  ${fields.scope.value}`,
      '------------------------------------------------------',
      'PROJECT PRIORITIES & SITE DETAILS:',
      fields.message.value.trim(),
      '======================================================',
      'Prepared via txlandscapeservices.com'
    ].join('\n');

    const mailtoUri = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(inquiryBody)}`;

    if (previewText) previewText.value = inquiryBody;
    if (openDraft) openDraft.href = mailtoUri;

    if (previewSection) {
      previewSection.hidden = false;
      previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      previewSection.focus();
    }

    if (formStatus) {
      formStatus.textContent = 'Inquiry prepared. Open your email draft or copy the inquiry text below.';
      formStatus.className = 'form-status is-success';
    }
  });

  copyInquiry?.addEventListener('click', async () => {
    if (!previewText) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(previewText.value);
      } else {
        previewText.select();
        document.execCommand('copy');
      }

      if (copyStatus) copyStatus.textContent = 'Inquiry copied to clipboard.';
    } catch {
      if (copyStatus) copyStatus.textContent = 'Select all text above and copy manually.';
    }
  });

  const yearEl = document.querySelector('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();