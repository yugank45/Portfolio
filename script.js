/**
 * Yugank Singh — Full Stack Developer Portfolio
 * Ultra-smooth canvas scrubbing engine with Linear Interpolation (Lerp),
 * IntersectionObserver scroll reveals, active nav tracking, and copy interactions.
 */

(function () {
  'use strict';

  // --- Configuration ---
  const TOTAL_FRAMES = 192;
  const FRAME_PREFIX = 'sunglasses_video_frames/frame_';
  const FRAME_EXTENSION = '.jpg';
  const LERP_FACTOR = 0.12;

  // --- DOM Elements ---
  const canvas = document.getElementById('animation-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const progressBar = document.getElementById('scrub-progress-fill');
  const currentFrameEl = document.getElementById('current-frame-num');
  const totalFrameEl = document.getElementById('total-frame-num');
  const scrollPrompt = document.getElementById('scroll-prompt');
  const preloadPill = document.getElementById('preload-status');
  const preloadText = document.getElementById('preload-text');
  const preloadBarFill = document.getElementById('preload-bar-fill');

  totalFrameEl.textContent = String(TOTAL_FRAMES).padStart(3, '0');

  // --- State Variables ---
  const frames = new Array(TOTAL_FRAMES);
  const frameLoaded = new Array(TOTAL_FRAMES).fill(false);
  let loadedCount = 0;
  let targetProgress = 0;
  let smoothProgress = 0;
  let lastDrawnImage = null;
  let currentTargetIndex = 0;

  // Path generator (1-indexed)
  function getFramePath(index) {
    const padded = String(index).padStart(4, '0');
    return `${FRAME_PREFIX}${padded}${FRAME_EXTENSION}`;
  }

  // --- Responsive Canvas Sizing (HiDPI / Retina) ---
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resizeCanvas() {
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(viewportWidth * dpr);
    canvas.height = Math.round(viewportHeight * dpr);
    canvas.style.width = viewportWidth + 'px';
    canvas.style.height = viewportHeight + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    lastDrawnImage = null;
    drawFrame(currentTargetIndex, true);
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    updateScrollProgress();
  }, { passive: true });
  resizeCanvas();

  // --- Aspect-Ratio Cover Fit with Right-Anchored Portrait Positioning ---
  function drawCoverImage(img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const scale = Math.max(viewportWidth / imgWidth, viewportHeight / imgHeight);
    const drawWidth = imgWidth * scale;
    const drawHeight = imgHeight * scale;

    // Shift canvas portrait cleanly towards the right on desktop (viewportWidth >= 900)
    // Anchoring subject center at ~66% screen width, leaving left text column with 100% contrast
    let offsetX;
    if (viewportWidth >= 900) {
      offsetX = (viewportWidth * 0.66) - (drawWidth * 0.50);
    } else {
      offsetX = (viewportWidth - drawWidth) * 0.5;
    }
    const offsetY = (viewportHeight - drawHeight) * 0.5;

    ctx.fillStyle = '#08080a';
    ctx.fillRect(0, 0, viewportWidth, viewportHeight);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    lastDrawnImage = img;
  }

  // --- Nearest-Neighbor Loaded Frame Search ---
  function findClosestLoadedFrame(targetIdx) {
    if (frameLoaded[targetIdx] && frames[targetIdx]) {
      return frames[targetIdx];
    }

    for (let offset = 1; offset < TOTAL_FRAMES; offset++) {
      const prev = targetIdx - offset;
      if (prev >= 0 && frameLoaded[prev] && frames[prev]) {
        return frames[prev];
      }

      const next = targetIdx + offset;
      if (next < TOTAL_FRAMES && frameLoaded[next] && frames[next]) {
        return frames[next];
      }
    }
    return null;
  }

  // --- Render Frame ---
  function drawFrame(frameIndex, force = false) {
    currentTargetIndex = frameIndex;
    const img = findClosestLoadedFrame(frameIndex);

    if (img) {
      if (force || img !== lastDrawnImage) {
        drawCoverImage(img);
      }
    }

    currentFrameEl.textContent = String(frameIndex + 1).padStart(3, '0');
  }

  // --- Scroll Progress Calculation ---
  function getMaxScroll() {
    const docHeight = Math.max(
      document.body.scrollHeight || 0,
      document.documentElement.scrollHeight || 0,
      document.body.offsetHeight || 0,
      document.documentElement.offsetHeight || 0
    );
    return Math.max(1, docHeight - window.innerHeight);
  }

  function updateScrollProgress() {
    const scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    const maxScroll = getMaxScroll();
    targetProgress = Math.max(0, Math.min(1, scrollY / maxScroll));

    if (scrollY > 40) {
      scrollPrompt.classList.add('hidden');
    } else {
      scrollPrompt.classList.remove('hidden');
    }
  }

  window.addEventListener('scroll', updateScrollProgress, { passive: true });
  window.addEventListener('wheel', updateScrollProgress, { passive: true });

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    const maxScroll = getMaxScroll();
    const step = maxScroll / (TOTAL_FRAMES - 1) * 6;

    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      window.scrollBy({ top: step, behavior: 'smooth' });
    } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      window.scrollBy({ top: -step, behavior: 'smooth' });
    }
  });

  // --- Animation Render Loop ---
  function animationLoop() {
    const diff = targetProgress - smoothProgress;

    if (Math.abs(diff) > 0.0001) {
      smoothProgress += diff * LERP_FACTOR;
    } else {
      smoothProgress = targetProgress;
    }

    // Update top scrub bar
    progressBar.style.width = (smoothProgress * 100).toFixed(2) + '%';

    // Target frame (0 to 191)
    const targetIndex = Math.min(
      TOTAL_FRAMES - 1,
      Math.max(0, Math.round(smoothProgress * (TOTAL_FRAMES - 1)))
    );

    drawFrame(targetIndex);

    // Subtle background canvas dimming as user moves down page
    const ambientOpacity = Math.max(0.38, 1 - smoothProgress * 0.55);
    canvas.style.opacity = ambientOpacity.toFixed(2);

    requestAnimationFrame(animationLoop);
  }

  // --- Progressive Fast-Track Preload & Dynamic Streaming ---
  function startPreloading() {
    // 1. Critical first frame (Hero background) - load immediately
    const firstImg = new Image();
    firstImg.src = getFramePath(1);

    const onFirstFrame = () => {
      frames[0] = firstImg;
      frameLoaded[0] = true;
      loadedCount++;
      drawFrame(0, true);

      initProgressiveStreaming();
    };

    if (firstImg.complete && firstImg.naturalWidth !== 0) {
      onFirstFrame();
    } else {
      firstImg.onload = onFirstFrame;
      firstImg.onerror = () => {
        initProgressiveStreaming();
      };
    }

    function initProgressiveStreaming() {
      // Step A: Keyframes fast-track (initial 6 frames + every 8th anchor frame)
      // Gives instant scroll responsiveness in ~300ms while loading ~1MB total
      const keyframeSet = new Set();
      for (let i = 0; i < Math.min(6, TOTAL_FRAMES); i++) keyframeSet.add(i);
      for (let i = 0; i < TOTAL_FRAMES; i += 8) keyframeSet.add(i);
      keyframeSet.add(TOTAL_FRAMES - 1);

      const keyframes = Array.from(keyframeSet);
      let keyframesLoaded = 0;
      const totalKeyframes = keyframes.length;
      const enqueued = new Set([0]);

      function loadFrame(idx, onComplete) {
        if (frameLoaded[idx]) {
          if (onComplete) onComplete();
          return;
        }
        const img = new Image();
        img.src = getFramePath(idx + 1);
        img.onload = () => {
          frames[idx] = img;
          frameLoaded[idx] = true;
          loadedCount++;
          if (idx === currentTargetIndex) {
            drawFrame(currentTargetIndex, true);
          }
          if (onComplete) onComplete();
        };
        img.onerror = () => {
          if (onComplete) onComplete();
        };
      }

      // Fast-track keyframes with controlled concurrency (4 parallel downloads)
      let kIndex = 0;
      const KEYFRAME_CONCURRENCY = 4;

      function spawnKeyframeWorker() {
        if (kIndex >= keyframes.length) return;
        const idx = keyframes[kIndex++];
        enqueued.add(idx);

        loadFrame(idx, () => {
          keyframesLoaded++;
          const pct = Math.min(100, Math.round((keyframesLoaded / totalKeyframes) * 100));
          if (preloadBarFill) preloadBarFill.style.width = pct + '%';
          if (preloadText) preloadText.textContent = `Ready (${pct}%)`;

          // When keyframes finish, dismiss loading pill immediately and start streaming
          if (keyframesLoaded >= totalKeyframes) {
            if (preloadText) preloadText.textContent = 'Ready (100%)';
            if (preloadBarFill) preloadBarFill.style.width = '100%';
            setTimeout(() => {
              if (preloadPill) preloadPill.classList.add('loaded');
            }, 300);

            startBackgroundStream();
          } else {
            spawnKeyframeWorker();
          }
        });
      }

      for (let w = 0; w < KEYFRAME_CONCURRENCY; w++) {
        spawnKeyframeWorker();
      }

      // Step B: Smart background streaming with distance-to-scroll prioritization
      function startBackgroundStream() {
        const remainingQueue = [];
        for (let i = 0; i < TOTAL_FRAMES; i++) {
          if (!enqueued.has(i)) {
            remainingQueue.push(i);
            enqueued.add(i);
          }
        }

        const BG_CONCURRENCY = 3;
        let activeBgWorkers = 0;

        function getNextPriorityFrame() {
          if (remainingQueue.length === 0) return null;
          // Prioritize frames closest to user's current scroll viewport
          let bestIdx = 0;
          let minDistance = Infinity;
          for (let i = 0; i < remainingQueue.length; i++) {
            const dist = Math.abs(remainingQueue[i] - currentTargetIndex);
            if (dist < minDistance) {
              minDistance = dist;
              bestIdx = i;
            }
          }
          return remainingQueue.splice(bestIdx, 1)[0];
        }

        function pumpBgWorker() {
          while (activeBgWorkers < BG_CONCURRENCY && remainingQueue.length > 0) {
            const nextFrame = getNextPriorityFrame();
            if (nextFrame === null || nextFrame === undefined) break;

            activeBgWorkers++;
            loadFrame(nextFrame, () => {
              activeBgWorkers--;
              if (remainingQueue.length > 0) {
                if ('requestIdleCallback' in window) {
                  requestIdleCallback(() => pumpBgWorker(), { timeout: 120 });
                } else {
                  setTimeout(pumpBgWorker, 16);
                }
              }
            });
          }
        }

        pumpBgWorker();
      }
    }
  }

  // --- IntersectionObserver for Scroll-Triggered Reveals ---
  function initScrollReveals() {
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealElements = document.querySelectorAll('.reveal-on-scroll');

    // If user prefers reduced motion or browser doesn't support IntersectionObserver, reveal immediately
    if (isReducedMotion || !('IntersectionObserver' in window)) {
      revealElements.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    // Configure ~100ms sibling stagger on card containers
    const staggerContainers = [
      '.about-highlights-col',
      '.skills-categories-grid',
      '.projects-showcase-stack',
      '.contributions-grid',
      '.achievements-grid',
      '.summary-stats-grid'
    ];

    staggerContainers.forEach((selector) => {
      document.querySelectorAll(selector).forEach((container) => {
        const siblings = container.querySelectorAll(':scope > .reveal-on-scroll');
        siblings.forEach((el, index) => {
          el.style.setProperty('--stagger-delay', `${index * 100}ms`);
        });
      });
    });

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach((el) => observer.observe(el));
  }

  // --- Active Nav Link Highlighting on Scroll ---
  function initNavTracking() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
      let currentSectionId = '';
      const scrollPos = window.pageYOffset || document.documentElement.scrollTop;

      sections.forEach((section) => {
        const top = section.offsetTop - 140;
        const height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentSectionId = section.getAttribute('id');
        }
      });

      navLinks.forEach((link) => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSectionId}`) {
          link.classList.add('active');
        }
      });
    }, { passive: true });
  }

  // --- Copy Email Interaction ---
  function initCopyEmail() {
    const copyBtn = document.getElementById('btn-copy-email');
    const copyLabel = document.getElementById('copy-btn-label');
    const emailToCopy = 'yugankyogeshsingh2020@gmail.com';

    if (copyBtn && copyLabel) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(emailToCopy);
          copyLabel.textContent = 'Copied! ✓';
          copyBtn.classList.add('copied');

          setTimeout(() => {
            copyLabel.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2500);
        } catch (err) {
          // Fallback if clipboard API is blocked
          const textarea = document.createElement('textarea');
          textarea.value = emailToCopy;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);

          copyLabel.textContent = 'Copied! ✓';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyLabel.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2500);
        }
      });
    }
  }

  // --- Copy Phone Interaction ---
  function initCopyPhone() {
    const copyBtn = document.getElementById('btn-copy-phone');
    const copyLabel = document.getElementById('copy-phone-label');
    const phoneToCopy = '+919356920426';

    if (copyBtn && copyLabel) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(phoneToCopy);
          copyLabel.textContent = 'Copied! ✓';
          copyBtn.classList.add('copied');

          setTimeout(() => {
            copyLabel.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2500);
        } catch (err) {
          const textarea = document.createElement('textarea');
          textarea.value = phoneToCopy;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);

          copyLabel.textContent = 'Copied! ✓';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyLabel.textContent = 'Copy';
            copyBtn.classList.remove('copied');
          }, 2500);
        }
      });
    }
  }

  // --- Resume Actions (Print & ATS Copy) ---
  function initResumeActions() {
    const printBtn = document.getElementById('btn-print-resume');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    const copyResumeBtn = document.getElementById('btn-copy-resume');
    const copyResumeLabel = document.getElementById('copy-resume-label');

    const atsResumeText = `YUGANK SINGH
Aspiring Software Engineer — Full Stack Developer
Phone: +91-9356920426 | Email: yugankyogeshsingh2020@gmail.com
LinkedIn: https://www.linkedin.com/in/yugank-singh | GitHub: https://github.com/yugank45

SUMMARY
Full-Stack Software Engineer with production experience across modern JavaScript/TypeScript, React.js, Node.js, and Java backend architectures. Proven capability architecting resilient microservices, sub-second multimodal AI vision pipelines, and atomic transaction ledgers — strengthened by hands-on fintech workflow and administrative panel engineering at BlackOriginX (Torkk).

EXPERIENCE
BlackOriginX Private Limited — Torkk
Admin Panel Intern | 1-Month Internship (Sep 2026 – Oct 2026)
- Developed, modified, and enhanced the platform's Admin Panel based on project requirements, improving overall functionality and usability.
- Worked on Admin Panel and backend integration, identifying and resolving technical issues that arose during the integration process.
- Went beyond the core role to understand and fix issues in the Golang backend, enabling smooth end-to-end system integration.
- Implemented and integrated AI-based functionalities within the Admin Panel.
- Studied existing workflows and made improvements to them; contributed to website design and implementation work as required.
- Collaborated across frontend, backend, and design areas while adapting quickly to changing project requirements.

TECHNICAL SKILLS
- Programming Languages: Java, JavaScript, TypeScript, SQL, Golang (working knowledge)
- Frontend: HTML, CSS, React.js, Bootstrap, Tailwind CSS, Material UI
- Backend: Node.js, Express.js, REST APIs, JWT Authentication, Passport.js
- Databases: MongoDB, MySQL, PostgreSQL
- AI & Integration: AI Feature Integration, Groq Vision API, Admin Panel–Backend Integration
- Tools: Git, GitHub, Postman, VS Code
- Core CS Fundamentals: Data Structures and Algorithms, OOPs, DBMS, Operating Systems, Computer Networks

PROJECTS
Wanderlust (2026) | Node.js, Express.js, MongoDB (2dsphere), EJS
- Developed a full-stack accommodation listing platform inspired by Airbnb using Node.js, Express.js, MongoDB, and EJS.
- Implemented 2dsphere spatial indexing in MongoDB paired with Mapbox API geocoding, enabling sub-50ms proximity search for global listings.
- Engineered persistent MongoStore cookie sessions with Passport.js and centralized Joi schema validation middleware to prevent NoSQL injection.
- Configured Cloudinary asset streaming with automatic image transformation, MIME type filtering, and global error handling eliminating uncaught async exceptions.

Zerodha Clone (2026) | MongoDB, Express.js, React.js, Node.js
- Developed a full-stack trading platform simulation inspired by Zerodha using the MERN stack architecture.
- Designed atomic MongoDB operations for buy/sell order execution, maintaining mathematical ledger balance across user margin, holdings, and order history without race conditions.
- Engineered React state management with debounced render updates and memoized selectors, throttling high-frequency market fluctuations to maintain silky 60fps Chart.js visualizations.
- Implemented secure JWT session tokens delivered via encrypted HTTP-only, SameSite=Strict cookies, mitigating XSS token theft while isolating trading routes.

ClaimVision AI (2026) | React.js, Node.js, FastAPI, MongoDB, Groq Vision API
- Finalist submission among 1,700+ competing developers in the HackerRank Orchestrate AI Hackathon.
- Evaluated multi-modal vehicle damage prompts using Groq Vision API, achieving automated inspection reports with sub-second inference latency and standardized damage severity classification.
- Engineered a decoupled FastAPI backend with asynchronous request workers and stream-based image validation, reliably processing high-resolution collision photography.
- Developed automated claim report generation supporting real-time Excel (.xlsx) and CSV exports via vectorized table parsing, accelerating adjuster verification cycles.

COMPETITIVE ACHIEVEMENTS
- Finalist Submission among 1,700+ competing developers in the HackerRank Orchestrate AI Hackathon with ClaimVision AI.
- National Elite Distinction (Score: 93/100, Top 5%) in Programming in Java by NPTEL / IIT Kharagpur (2026).
- Merged Pull Requests — Ownlyst & Hisaabo: Contributed to production codebases: engineered interactive calendar views and localized timezone synchronization on Ownlyst; delivered TDS deduction allocation and gross settlement accounting workflows on the Hisaabo fintech platform.

CERTIFICATIONS
- Delta Full Stack Web Development — Apna College (2026)
- Front-End Web Development — Infosys Springboard (2025)
- Career Essentials in Generative AI — Microsoft & LinkedIn (2024)

EDUCATION
B.E. in Information Technology (Expected Graduation: 2027 • CGPA: 7.23 / 10 • Latest SGPA: 8.64)
Bharati Vidyapeeth College of Engineering, Navi Mumbai`;

    if (copyResumeBtn && copyResumeLabel) {
      copyResumeBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(atsResumeText);
          copyResumeLabel.textContent = 'Copied! ✓';
          copyResumeBtn.classList.add('copied');

          setTimeout(() => {
            copyResumeLabel.textContent = 'Copy ATS Text';
            copyResumeBtn.classList.remove('copied');
          }, 2500);
        } catch (err) {
          const textarea = document.createElement('textarea');
          textarea.value = atsResumeText;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);

          copyResumeLabel.textContent = 'Copied! ✓';
          copyResumeBtn.classList.add('copied');
          setTimeout(() => {
            copyResumeLabel.textContent = 'Copy ATS Text';
            copyResumeBtn.classList.remove('copied');
          }, 2500);
        }
      });
    }
  }

  // --- Hero 3D Cinematic Depth & Parallax ---
  function initHero3DDepth() {
    const hero = document.getElementById('hero');
    if (!hero) return;

    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || isReducedMotion) return;

    let rafId = null;
    let targetPanX = 0;
    let targetPanY = 0;
    let targetCardRx = 0;
    let targetCardRy = 0;

    function applyTransforms() {
      hero.style.setProperty('--hero-pan-x', `${targetPanX.toFixed(2)}px`);
      hero.style.setProperty('--hero-pan-y', `${targetPanY.toFixed(2)}px`);
      hero.style.setProperty('--hero-card-rx', `${targetCardRx.toFixed(2)}deg`);
      hero.style.setProperty('--hero-card-ry', `${targetCardRy.toFixed(2)}deg`);
      rafId = null;
    }

    hero.addEventListener('pointermove', (e) => {
      const rect = hero.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) return;

      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1; // -1 to 1
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1; // -1 to 1

      // Restrained values: max 12px pan, max 4.5deg rotation on statement card
      targetPanX = normX * 12;
      targetPanY = normY * 12;
      targetCardRx = -normY * 4.5;
      targetCardRy = normX * 4.5;

      if (!rafId) {
        rafId = requestAnimationFrame(applyTransforms);
      }
    }, { passive: true });

    function resetHero() {
      targetPanX = 0;
      targetPanY = 0;
      targetCardRx = 0;
      targetCardRy = 0;
      applyTransforms();
    }

    hero.addEventListener('pointerleave', resetHero);
    window.addEventListener('blur', resetHero);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) resetHero();
    });
  }

  // --- Project Cards & Skill Cards Interactive 3D Tilt with Cursor Spotlight ---
  function initProjectCardTilt() {
    const isFinePointer = window.matchMedia('(pointer: fine)').matches;
    const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!isFinePointer || isReducedMotion) return;

    const cards = document.querySelectorAll('.featured-project-card, .skill-category-card, .resume-summary-card');

    cards.forEach((card) => {
      let rafId = null;
      let targetTiltX = 0;
      let targetTiltY = 0;
      let targetMouseX = 0;
      let targetMouseY = 0;

      function updateCardTransform() {
        card.style.setProperty('--tilt-x', `${targetTiltX.toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${targetTiltY.toFixed(2)}deg`);
        card.style.setProperty('--mouse-x', `${targetMouseX.toFixed(1)}px`);
        card.style.setProperty('--mouse-y', `${targetMouseY.toFixed(1)}px`);
        card.style.setProperty('--spotlight-opacity', '1');
        card.style.setProperty('--sheen-opacity', '1');
        rafId = null;
      }

      card.addEventListener('pointerenter', () => {
        card.classList.add('is-tilting');
      });

      card.addEventListener('pointermove', (e) => {
        const rect = card.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Normalized from -1 to 1
        const percentX = (x / rect.width) * 2 - 1;
        const percentY = (y / rect.height) * 2 - 1;

        // Restrained tilt range (approximately 3.5–4.5 degrees)
        const maxTilt = 4.0;
        targetTiltX = -percentY * maxTilt;
        targetTiltY = percentX * maxTilt;

        targetMouseX = x;
        targetMouseY = y;

        if (!rafId) {
          rafId = requestAnimationFrame(updateCardTransform);
        }
      }, { passive: true });

      function resetCard() {
        card.classList.remove('is-tilting');
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
        card.style.setProperty('--spotlight-opacity', '0');
        card.style.setProperty('--sheen-opacity', '0');
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      }

      card.addEventListener('pointerleave', resetCard);
      window.addEventListener('blur', resetCard);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) resetCard();
      });
    });
  }

  // --- Initialize All Modules ---
  updateScrollProgress();
  startPreloading();
  initScrollReveals();
  initNavTracking();
  initCopyEmail();
  initCopyPhone();
  initResumeActions();
  initHero3DDepth();
  initProjectCardTilt();
  requestAnimationFrame(animationLoop);

})();

