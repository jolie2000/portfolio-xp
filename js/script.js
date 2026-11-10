// Grab the page pieces that JavaScript updates after the initial render.
const preloader = document.getElementById("preloader");
const bootScreen = document.getElementById("bootScreen");
const loginScreen = document.getElementById("loginScreen");
const welcomeScreen = document.getElementById("welcomeScreen");
const preloaderUser = document.getElementById("preloaderUser");
const desktop = document.getElementById("desktop");
const wallpaperVideo = document.querySelector(".desktop-wallpaper-video");
const startMenu = document.getElementById("startMenu");
const startButton = document.getElementById("startButton");
const footerPills = Array.from(document.querySelectorAll(".footer-pill"));
const loginRestartButton = document.querySelector(
  ".preloader-footer-left",
);
const windowLayer = document.getElementById("windowLayer");
const taskbarWindows = document.getElementById("taskbarWindows");
const clock = document.getElementById("clock");
const icons = Array.from(document.querySelectorAll(".desktop-icon"));
const resumeSections = {
  about: { title: "Professional Summary", color: "resume-card-pink" },
  skills: { title: "Technical Skills", color: "resume-card-purple" },
  projects: { title: "Projects", color: "resume-card-pink" },
  experience: { title: "Work Experience", color: "resume-card-purple" },
  education: { title: "Education and Certificates", color: "resume-card-amber" },
  contact: { title: "Contact", color: "resume-card-pink" },
};
const startMenuLinks = Array.from(
  document.querySelectorAll("[data-window-open]"),
);
const trayRestartButton = document.querySelector(
  '.tray-icons img[src*="restart.webp"]',
);
// AudioContext is optional; the portfolio still works if the browser has no audio support.
const AudioContextClass =
  window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
let preloaderFinished = false;

// The XP-style login and logout sounds use Web Audio instead of extra sound files.
// Create the sound context only when a visitor triggers a system sound.
function getAudioContext() {
  if (!AudioContextClass) {
    return null;
  }

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }

  return audioCtx;
}

// Play a short sequence of notes for login and shutdown feedback.
async function playSystemChime(
  notes,
  waveType,
  noteSpacing,
  peakVolume,
  noteLength,
) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      return;
    }
  }

  notes.forEach((frequency, index) => {
    const startTime = context.currentTime + index * noteSpacing;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = waveType;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(peakVolume, startTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + noteLength,
    );
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + noteLength);
  });

  await new Promise((resolve) => {
    window.setTimeout(
      resolve,
      ((notes.length - 1) * noteSpacing + noteLength) * 1000,
    );
  });
}

// Login and logout use different notes from the same small sound helper.
function playLoginSound() {
  return playSystemChime(
    [523.25, 659.25, 783.99, 1046.5],
    "sine",
    0.12,
    0.18,
    0.6,
  );
}

function playLogoutSound() {
  playSystemChime(
    [783.99, 659.25, 523.25],
    "triangle",
    0.18,
    0.15,
    0.7,
  );
}

// Try to resume the wallpaper after a browser pauses background video.
function playWallpaperVideo() {
  if (!wallpaperVideo || document.visibilityState === "hidden") {
    return;
  }

  wallpaperVideo.muted = true;
  wallpaperVideo.defaultMuted = true;
  wallpaperVideo.playsInline = true;
  wallpaperVideo.controls = false;
  wallpaperVideo.removeAttribute("controls");

  if (!wallpaperVideo.dataset.mobilePlaybackRetry) {
    wallpaperVideo.dataset.mobilePlaybackRetry = "true";
    wallpaperVideo.addEventListener("canplay", () => {
      if (!document.hidden && desktop.classList.contains("is-ready")) {
        wallpaperVideo.play().catch(() => {});
      }
    });
  }

  const playback = wallpaperVideo.play();
  if (playback) {
    playback.catch(() => {});
  }
}

// Browsers may pause the wallpaper when the tab is hidden, so resume it on return.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && desktop.classList.contains("is-ready")) {
    playWallpaperVideo();
  }
});

window.addEventListener("pageshow", () => {
  if (desktop.classList.contains("is-ready")) {
    playWallpaperVideo();
  }
});

// Default sizes and templates for each app window.
const windowConfig = {
  about: {
    title: "About Me",
    templateId: "aboutTemplate",
    icon: "assets/icons/about.webp",
    width: 800,
    height: 590,
  },
  resume: {
    title: "My Resume",
    templateId: "resumeTemplate",
    icon: "assets/icons/resume.webp",
    width: 700,
    height: 620,
  },
  projects: {
    title: "My Projects",
    templateId: "projectsTemplate",
    icon: "assets/icons/projects.webp",
    width: 980,
    height: 650,
  },
  contact: {
    title: "Contact Me",
    templateId: "contactTemplate",
    icon: "assets/icons/contact.webp",
    width: 620,
    height: 450,
  },
};

// Keep each window's element and open/minimized state together.
const windows = new Map();
let topZ = 20;
let activeWindowId = null;
let dragState = null;

if (footerPills[0]) {
  // The first footer action is the Start menu's Log Off button.
  footerPills[0].textContent = "Log Off";
}

// Bring the newest active window to the front.
function nextZIndex() {
  topZ += 1;
  return topZ;
}

// Small delay helper used by the boot and restart screens.
function wait(duration) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}

// Show the boot screen, then hand control to the login screen.
async function runPreloader(options = {}) {
  const { bootDuration = 2000, grayscale = false } = options;
  preloaderFinished = false;
  document.body.classList.toggle("restarting", grayscale);
  document.body.classList.add("preloader-active");
  preloader.classList.remove("is-hidden");
  desktop.classList.remove("is-ready");
  bootScreen.classList.remove("is-hidden");
  loginScreen.classList.add("is-hidden");
  welcomeScreen.classList.add("is-hidden");
  await wait(bootDuration);
  bootScreen.classList.add("is-hidden");
  loginScreen.classList.remove("is-hidden");
  document.body.classList.remove("restarting");
  preloaderFinished = true;
}

// Close open windows and replay the boot sequence when Restart is chosen.
async function restartSystem() {
  playLogoutSound();
  closeStartMenu();
  clearIconSelection();
  windows.forEach((entry) => {
    entry.element.classList.remove("closing", "active", "minimized");
    entry.element.style.display = "none";
    entry.isOpen = false;
    entry.minimized = false;
    entry.maximized = false;
  });
  activeWindowId = null;
  renderTaskbar();
  await runPreloader({ bootDuration: 2000, grayscale: true });
}

// Finish the login sequence and reveal the desktop.
async function finishPreloader(loginChime = Promise.resolve()) {
  if (!preloaderFinished) {
    return;
  }

  closeStartMenu();
  await loginChime;
  loginScreen.classList.add("is-hidden");
  welcomeScreen.classList.remove("is-hidden");
  await wait(1000);
  preloader.classList.add("is-hidden");
  desktop.classList.add("is-ready");
  document.body.classList.remove("preloader-active");
  playWallpaperVideo();
}

// Keep the taskbar clock in the visitor's local time format.
function formatClock() {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Close the Start menu and keep its accessibility state in sync.
function closeStartMenu() {
  startMenu.classList.remove("is-open");
  startMenu.setAttribute("aria-hidden", "true");
}

// Toggle the Start menu from the taskbar button.
function toggleStartMenu() {
  const isOpen = startMenu.classList.toggle("is-open");
  startMenu.setAttribute("aria-hidden", String(!isOpen));
}

// Only one desktop shortcut can be selected at a time.
function selectIcon(icon) {
  icons.forEach((item) =>
    item.classList.toggle("selected", item === icon),
  );
}

// Clear shortcut selection after a restart or desktop click.
function clearIconSelection() {
  icons.forEach((item) => item.classList.remove("selected"));
}

// Keep window positions inside the visible desktop area.
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Fit each window to the current screen without making it too small to use.
function getResponsiveMetrics(config) {
  const isCompactScreen = window.innerWidth <= 640;
  const maxWidth = Math.min(
    config.width,
    window.innerWidth - (isCompactScreen ? 12 : 16),
  );
  const maxHeight = Math.min(
    config.height,
    window.innerHeight - (isCompactScreen ? 58 : 64),
  );
  return {
    width: Math.max(maxWidth, isCompactScreen ? 220 : 280),
    height: Math.max(maxHeight, isCompactScreen ? 160 : 180),
  };
}

// Stagger windows so several open apps do not land on top of one another.
function getWindowPosition(index, width, height) {
  const offset = 34 * index;
  const maxLeft = Math.max(8, window.innerWidth - width - 8);
  const maxTop = Math.max(8, window.innerHeight - height - 52);
  const baseLeft = window.innerWidth <= 640 ? 6 : 110 + offset;
  const baseTop =
    window.innerWidth <= 640 ? 38 + Math.min(offset, 36) : 70 + offset;

  return {
    left: clamp(baseLeft, 8, maxLeft),
    top: clamp(baseTop, 8, maxTop),
  };
}

// Clone a template so every app window gets its own interactive content.
function createWindowContent(templateId) {
  const template = document.getElementById(templateId);
  return template.content.cloneNode(true);
}

// Return only windows that are open and not minimized.
function getVisibleWindows() {
  return Array.from(windows.values()).filter(
    (entry) => entry.isOpen && !entry.minimized,
  );
}

// Mark one visible window as active and update the taskbar styling.
function setActiveWindow(windowId) {
  activeWindowId = windowId;

  windows.forEach((entry, key) => {
    const isActive = key === windowId && entry.isOpen && !entry.minimized;
    entry.element.classList.toggle("active", isActive);
  });
}

// Restore focus to the topmost remaining window after one closes.
function syncTopWindow() {
  const visibleEntries = getVisibleWindows();
  const topEntry = visibleEntries.sort(
    (a, b) =>
      Number(b.element.style.zIndex) - Number(a.element.style.zIndex),
  )[0];

  setActiveWindow(topEntry ? topEntry.id : null);
  renderTaskbar();
}

// Bring an existing window forward and restore it if it was minimized.
function focusWindow(windowId) {
  const entry = windows.get(windowId);
  if (!entry || !entry.isOpen || entry.minimized) {
    return;
  }

  closeStartMenu();
  entry.element.style.zIndex = String(nextZIndex());
  setActiveWindow(windowId);
  renderTaskbar();
}

// Download the supplied CV file from the resume toolbar.
function downloadResume(resumePage) {
  if (!resumePage?.querySelector("[data-resume-document]")) {
    return;
  }

  const downloadLink = document.createElement("a");
  downloadLink.href = "assets/documents/Uwase-Jolie-CV.docx";
  downloadLink.download = "Uwase-Jolie-CV.docx";
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
}

// Rebuild taskbar buttons from the windows that are currently open.
function renderTaskbar() {
  taskbarWindows.innerHTML = "";

  Array.from(windows.values())
    .filter((entry) => entry.isOpen)
    .sort(
      (a, b) =>
        Number(a.element.style.zIndex) - Number(b.element.style.zIndex),
    )
    .forEach((entry) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "taskbar-item";
      if (entry.id === activeWindowId && !entry.minimized) {
        item.classList.add("active");
      }

      item.innerHTML = `
        <span class="taskbar-item-icon" aria-hidden="true"><img src="${entry.icon}" alt="" aria-hidden="true" /></span>
        <span>${entry.title}</span>
      `;

      item.addEventListener("click", () => {
        if (entry.minimized) {
          restoreWindow(entry.id);
          return;
        }

        focusWindow(entry.id);
      });
      taskbarWindows.appendChild(item);
    });
}

// Hide a window while leaving its taskbar button available.
function minimizeWindow(windowId) {
  const entry = windows.get(windowId);
  if (!entry || !entry.isOpen || entry.minimized) {
    return;
  }

  entry.minimized = true;
  entry.element.classList.add("minimized");
  entry.element.style.display = "none";
  if (activeWindowId === windowId) {
    activeWindowId = null;
  }

  syncTopWindow();
}

// Show a minimized window again and bring it to the front.
function restoreWindow(windowId) {
  const entry = windows.get(windowId);
  if (!entry || !entry.isOpen) {
    return;
  }

  if (!entry.minimized) {
    focusWindow(windowId);
    return;
  }

  entry.minimized = false;
  entry.element.classList.remove("minimized");
  entry.element.style.display = "block";
  focusWindow(windowId);
}

// Play the closing animation, then remove the window from the taskbar.
function closeWindow(windowId) {
  const entry = windows.get(windowId);
  if (!entry || !entry.isOpen) {
    return;
  }

  entry.element.classList.add("closing");
  entry.element.addEventListener(
    "animationend",
    () => {
      entry.element.classList.remove("closing", "active", "minimized");
      entry.element.style.display = "none";
      entry.isOpen = false;
      entry.minimized = false;
      if (activeWindowId === windowId) {
        activeWindowId = null;
      }
      syncTopWindow();
    },
    { once: true },
  );
}

// Toggle between a window's saved size and the full desktop area.
function toggleMaximizeWindow(windowId) {
  const entry = windows.get(windowId);
  if (!entry || !entry.isOpen) {
    return;
  }

  const win = entry.element;
  if (!entry.maximized) {
    entry.previousRect = {
      left: win.style.left,
      top: win.style.top,
      width: win.style.width,
      height: win.style.height,
    };
    win.style.left = "0px";
    win.style.top = "0px";
    win.style.width = `${windowLayer.clientWidth}px`;
    win.style.height = `${windowLayer.clientHeight}px`;
    entry.maximized = true;
  } else {
    win.style.left = entry.previousRect.left;
    win.style.top = entry.previousRect.top;
    win.style.width = entry.previousRect.width;
    win.style.height = entry.previousRect.height;
    entry.maximized = false;
  }

  focusWindow(windowId);
}

// Let visitors move windows by dragging their title bars.
function attachDragBehavior(win, titleBar, windowId) {
  titleBar.addEventListener("mousedown", (event) => {
    if (event.button !== 0 || event.target.closest(".xp-button")) {
      return;
    }

    focusWindow(windowId);
    event.preventDefault();

    const rect = win.getBoundingClientRect();
    dragState = {
      win,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };

    document.body.classList.add("dragging");
  });
}

// Build a window from its config and cloned content template.
function createWindow(windowId, config, index) {
  const metrics = getResponsiveMetrics(config);
  const position = getWindowPosition(
    index,
    metrics.width,
    metrics.height,
  );
  const win = document.createElement("section");
  win.className = "window";
  win.dataset.windowId = windowId;
  win.style.width = `${metrics.width}px`;
  win.style.height = `${metrics.height}px`;
  win.style.left = `${position.left}px`;
  win.style.top = `${position.top}px`;
  win.style.display = "none";
  win.style.zIndex = String(nextZIndex());

  win.innerHTML = `
    <div class="title-bar">
      <div class="title-bar-text">
        <span class="title-bar-icon" aria-hidden="true"><img src="${config.icon}" alt="" aria-hidden="true" /></span>
        <span>${config.title}</span>
      </div>
      <div class="title-controls">
        <button class="xp-button" type="button" aria-label="Minimize">_</button>
        <button class="xp-button" type="button" aria-label="Maximize">&#9633;</button>
        <button class="xp-button close" type="button" aria-label="Close">X</button>
      </div>
    </div>
    <div class="window-body"></div>
  `;

  const body = win.querySelector(".window-body");
  const titleBar = win.querySelector(".title-bar");
  const closeButton = win.querySelector(".xp-button.close");
  const minimizeButton = win.querySelector(
    '.xp-button[aria-label="Minimize"]',
  );
  const maximizeButton = win.querySelector(
    '.xp-button[aria-label="Maximize"]',
  );

  body.appendChild(createWindowContent(config.templateId));
  windowLayer.appendChild(win);

  const entry = {
    id: windowId,
    title: config.title,
    icon: config.icon,
    element: win,
    minimized: false,
    isOpen: false,
    maximized: false,
    previousRect: null,
  };

  windows.set(windowId, entry);

  win.addEventListener("mousedown", () => {
    clearIconSelection();
    if (entry.isOpen && !entry.minimized) {
      focusWindow(windowId);
    }
  });
  closeButton.addEventListener("click", () => closeWindow(windowId));
  minimizeButton.addEventListener("click", () =>
    minimizeWindow(windowId),
  );
  maximizeButton.addEventListener("click", () =>
    toggleMaximizeWindow(windowId),
  );

  // Handle toolbar actions and the small filters inside this window.
  body.addEventListener("click", (event) => {
    const toolbarButton = event.target.closest(".toolbar-button");
    const filterButton = event.target.closest(".projects-nav a");
    if (toolbarButton) {
      const action = toolbarButton.textContent.trim().toLowerCase();

      if (action.includes("my projects")) {
        openWindow("projects");
      } else if (action.includes("my resume")) {
        openWindow("resume");
      } else if (action.includes("contact")) {
        openWindow("contact");
      } else if (action.includes("linkedin")) {
        window.open(
          "https://www.linkedin.com/in/jolie-uwase-b781543b9",
          "_blank",
          "noopener,noreferrer",
        );
      } else if (action.includes("send message")) {
        const fromInput = body.querySelector(
          'input[placeholder="Your email address"]',
        );
        const subjectInput = body.querySelector(
          'input[placeholder="Subject of your message"]',
        );
        const messageInput = body.querySelector(".compose-body");
        const subject = encodeURIComponent(
          subjectInput?.value || "Portfolio Inquiry",
        );
        const bodyText = encodeURIComponent(
          `From: ${fromInput?.value || ""}\n\n${messageInput?.value || ""}`,
        );
        window.location.href = `mailto:ujolie735@gmail.com?subject=${subject}&body=${bodyText}`;
        [fromInput, subjectInput, messageInput].forEach((field) => {
          if (field) {
            field.value = "";
          }
        });
        const contactStatus = body.querySelector(".window-status");
        if (contactStatus) {
          contactStatus.textContent =
            "Compose fields cleared. Check your email app to send the draft.";
        }
      } else if (action.includes("new message")) {
        body
          .querySelectorAll("input, textarea")
          .forEach((field, index) => {
            if (index > 0) {
              field.value = "";
            }
          });
      } else if (action.includes("zoom")) {
        const resumePage = body.querySelector(".resume-page");
        if (resumePage) {
          resumePage.style.transform = resumePage.style.transform
            ? ""
            : "scale(1.08)";
          resumePage.style.transformOrigin = "top center";
        }
      } else if (action.includes("download") || action.includes("save")) {
        downloadResume(body.querySelector(".resume-page"));
      } else if (action.includes("print")) {
        window.print();
      } else if (
        action.includes("home") ||
        action.includes("back") ||
        action.includes("forward") ||
        action.includes("up") ||
        action.includes("favorites")
      ) {
        focusWindow(windowId);
      }
    }

    // Resume tabs reuse the full document's sections instead of repeating CV copy.
    const resumeTab = event.target.closest("[data-resume-tab]");
    if (resumeTab && windowId === "resume") {
      const selectedTab = resumeTab.dataset.resumeTab;
      body.querySelectorAll("[data-resume-tab]").forEach((button) => {
        button.classList.toggle("is-active", button === resumeTab);
      });
      const fullDocument = body.querySelector("[data-resume-document]");
      const sectionView = body.querySelector("#resumeSectionView");
      const sectionTitle = body.querySelector("[data-resume-section-title]");
      const sectionContent = body.querySelector("[data-resume-section-content]");

      if (fullDocument && sectionView && sectionTitle && sectionContent) {
        const showFullResume = selectedTab === "all";
        fullDocument.hidden = !showFullResume;
        sectionView.hidden = showFullResume;

        if (!showFullResume) {
          const selectedSection = resumeSections[selectedTab];
          sectionView.classList.remove(
            "resume-card-pink",
            "resume-card-purple",
            "resume-card-amber",
          );
          sectionView.classList.add(selectedSection.color);
          sectionTitle.textContent = selectedSection.title;
          sectionContent.replaceChildren();

          const sourceSections = Array.from(
            fullDocument.querySelectorAll(
              `[data-resume-section="${selectedTab}"]`,
            ),
          );

          sourceSections.forEach((sourceSection, index) => {
            if (selectedTab === "contact") {
              sectionContent.appendChild(sourceSection.cloneNode(true));
              return;
            }

            Array.from(sourceSection.children).forEach((child) => {
              const isSectionHeading = child.tagName === "H2";
              const isAdditionalHeading = selectedTab === "education" && index > 0;
              if (!isSectionHeading || isAdditionalHeading) {
                sectionContent.appendChild(child.cloneNode(true));
              }
            });
          });
        }
      }
      body.querySelector(".resume-app-content")?.scrollTo({ top: 0, behavior: "smooth" });
    }

    // Project categories only hide and show cards; they do not navigate away.
    if (filterButton) {
      event.preventDefault();
      const filter = filterButton.dataset.filter || "all";
      body.querySelectorAll(".projects-nav a").forEach((link) => {
        link.classList.toggle("is-active", link === filterButton);
      });
      body.querySelectorAll(".project-shot").forEach((card) => {
        const matches =
          filter === "all" || card.dataset.category === filter;
        card.classList.toggle("is-hidden", !matches);
      });
    }
  });

  attachDragBehavior(win, titleBar, windowId);
}

// Open a new window or focus it if it is already open.
function openWindow(windowId) {
  const entry = windows.get(windowId);
  if (!entry) {
    return;
  }

  closeStartMenu();
  if (entry.isOpen && !entry.minimized) {
    focusWindow(windowId);
    return;
  }

  entry.isOpen = true;
  entry.minimized = false;
  entry.element.classList.remove("closing", "minimized");
  entry.element.style.display = "block";
  focusWindow(windowId);
}

// Desktop shortcuts open their matching app window on double click.
icons.forEach((icon) => {
  icon.addEventListener("click", (event) => {
    event.stopPropagation();
    event.preventDefault();
    const wasSelected = icon.classList.contains("selected");
    selectIcon(icon);

    if (wasSelected || event.detail >= 2) {
      openWindow(icon.dataset.window);
    }
  });

  icon.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectIcon(icon);
      openWindow(icon.dataset.window);
    }
  });
});

// Wire the Start button, login screen, menu items, and restart controls.
startButton.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleStartMenu();
});

preloaderUser.addEventListener("click", () => {
  const loginChime = playLoginSound();
  playWallpaperVideo();
  finishPreloader(loginChime);
});

preloaderUser.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    const loginChime = playLoginSound();
    playWallpaperVideo();
    finishPreloader(loginChime);
  }
});

startMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

startMenuLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    openWindow(link.dataset.windowOpen);
  });
});

footerPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    playLogoutSound();
    closeStartMenu();
    runPreloader();
  });
});

loginRestartButton?.addEventListener("click", () => {
  restartSystem();
});

trayRestartButton?.addEventListener("click", () => {
  restartSystem();
});

// Close menus and clear selected shortcuts when the empty desktop is clicked.
desktop.addEventListener("click", (event) => {
  if (
    !event.target.closest(".desktop-icon") &&
    !event.target.closest(".window") &&
    !event.target.closest(".start-menu") &&
    event.target !== startButton
  ) {
    clearIconSelection();
    closeStartMenu();
  }
});

// Continue dragging a window until the visitor releases the mouse button.
window.addEventListener("mousemove", (event) => {
  if (!dragState) {
    return;
  }

  event.preventDefault();
  const win = dragState.win;
  const maxLeft = window.innerWidth - win.offsetWidth - 8;
  const maxTop = window.innerHeight - win.offsetHeight - 52;
  const nextLeft = clamp(event.clientX - dragState.offsetX, 0, maxLeft);
  const nextTop = clamp(event.clientY - dragState.offsetY, 0, maxTop);

  win.style.left = `${nextLeft}px`;
  win.style.top = `${nextTop}px`;
});

// End a drag cleanly even if the mouse is released outside the window.
window.addEventListener("mouseup", () => {
  dragState = null;
  document.body.classList.remove("dragging");
});

// A click outside the Start menu closes it.
window.addEventListener("click", (event) => {
  if (!startMenu.contains(event.target) && event.target !== startButton) {
    closeStartMenu();
  }
});

// Refit open windows when the browser size changes.
window.addEventListener("resize", () => {
  windows.forEach((entry) => {
    const config = windowConfig[entry.id];
    const metrics = getResponsiveMetrics(config);
    const currentLeft = parseFloat(entry.element.style.left) || 0;
    const currentTop = parseFloat(entry.element.style.top) || 0;
    const maxLeft = Math.max(8, window.innerWidth - metrics.width - 8);
    const maxTop = Math.max(8, window.innerHeight - metrics.height - 52);

    entry.element.style.width = `${metrics.width}px`;
    entry.element.style.height = `${metrics.height}px`;
    entry.element.style.left = `${clamp(currentLeft, 8, maxLeft)}px`;
    entry.element.style.top = `${clamp(currentTop, 8, maxTop)}px`;

    if (entry.maximized) {
      entry.element.style.left = "0px";
      entry.element.style.top = "0px";
      entry.element.style.width = `${windowLayer.clientWidth}px`;
      entry.element.style.height = `${windowLayer.clientHeight}px`;
    }
  });
});

// Create the hidden window elements once; shortcuts reveal them on demand.
Object.entries(windowConfig).forEach(([windowId, config], index) => {
  createWindow(windowId, config, index);
});

// Start the clock and boot sequence after the window controls are ready.
formatClock();
setInterval(formatClock, 1000);
runPreloader();
