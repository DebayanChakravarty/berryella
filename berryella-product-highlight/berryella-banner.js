// berryella-banner.js
class BerryellaBanner extends HTMLElement {
    static get observedAttributes() {
      return [
        "data",
        "interval",
        "height",
        "min-height",
        "autoplay",
        "pause-on-hover",
        "show-dots",
        "overlay",
        "show-arrows",
        "show-play",
        "show-progress"
      ];
    }
  
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
  
      // defaults
      this._slides = [];
      this._i = 0;
      this._timer = null;
      this._progressTimer = null;
      this._interval = 5000;
      this._autoplay = true;        // desired playing state
      this._pauseOnHover = true;
      this._showDots = true;
      this._overlay = "linear-gradient(45deg, rgba(0,0,0,.40) 0%, rgba(0,0,0,.20) 100%)";
      this._showArrows = true;
      this._showPlay = true;
      this._showProgress = false;
      this._reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  
      const root = document.createElement("div");
      root.innerHTML = `
        <style>
          :host{
            --banner-height: 60vh;
            --banner-min-height: 300px;
            --overlay: ${this._overlay};
            --dot-size: 12px;
            --dot-gap: 12px;
            --fade-ms: 800ms;
            --control-bg: rgba(0,0,0,.35);
            --control-bd: rgba(255,255,255,.25);
            --control-fg: #fff;
            display:block;
            font-family: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          }
  
          .wrap{
            position:relative; width:100%;
            height: var(--banner-height);
            min-height: var(--banner-min-height);
            overflow:hidden;
            border-radius:2%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
  
          .slide{
            position:absolute; inset:0;
            opacity:0; transition: opacity var(--fade-ms) ease-in-out;
            background-size: cover; background-position: center; background-repeat: no-repeat;
          }
          .slide.active{ opacity:1; }
  
          .video{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:1 }
  
          .overlay{
            position:absolute; inset:0; z-index:2;
            background: var(--overlay);
            display:flex; align-items:center; justify-content:center;
          }
  
          .content{
            max-width: 820px; width: 100%;
            padding: 2rem; text-align:center; color:#fff;
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            animation: up .8s ease-out;
          }
          @keyframes up{ from{opacity:0; transform:translateY(30px)} to{opacity:1; transform:translateY(0)} }
  
          .badge{
            display:inline-block; padding:.5rem 1.25rem; border-radius:999px;
            background: linear-gradient(135deg, #ff6b6b, #ee5a24); font-weight:700; letter-spacing:.06em;
            font-size:.9rem; margin: 0 0 1rem; box-shadow: 0 4px 15px rgba(255,107,107,.3); text-transform:uppercase;
          }
          .title{
            font-size: clamp(1.8rem, 4.6vw, 3.5rem); font-weight:800; margin:0 0 1rem; line-height:1.2;
            text-shadow: 2px 2px 4px rgba(0,0,0,.3);
          }
          .sub{
            font-size: clamp(1rem, 2.2vw, 1.3rem); font-weight:300; line-height:1.45;
            opacity:.95; margin:0; max-width: 640px;
          }
  
          /* dots */
          .dots{
            position:absolute; left:50%; bottom:2.6rem; transform:translateX(-50%);
            z-index:3; display:flex; gap: var(--dot-gap);
          }
          .dot{
            width: var(--dot-size); height: var(--dot-size); border-radius:50%;
            background: rgba(255,255,255,.5); border: 2px solid transparent; cursor:pointer;
            transition: transform .25s ease, background .25s ease, box-shadow .25s ease;
          }
          .dot.active{
            background:#fff; transform: scale(1.2);
            box-shadow: 0 0 10px rgba(255,255,255,.5);
          }
  
          /* arrows */
          .arrow{
            position:absolute; top:50%; transform: translateY(-50%);
            width:44px; height:44px; border-radius:50%;
            background: var(--control-bg); color: var(--control-fg);
            border:1px solid var(--control-bd);
            display:grid; place-items:center; z-index:4; cursor:pointer;
            transition: transform .18s ease, background .18s ease, border-color .18s ease;
            -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          }
          .arrow:hover{ transform: translateY(-50%) scale(1.05); background: rgba(0,0,0,.42) }
          .arrow:focus-visible{ outline:2px solid #fff; outline-offset:2px }
          .arrow svg{ width:18px; height:18px }
          .prev{ left: 12px }
          .next{ right: 12px }
  
          /* play / pause */
          .play{
            position:absolute; left: 12px; bottom: 12px;
            width:42px; height:42px; border-radius:12px;
            background: var(--control-bg); color: var(--control-fg);
            border:1px solid var(--control-bd);
            display:grid; place-items:center; z-index:4; cursor:pointer;
            transition: transform .18s ease, background .18s ease, border-color .18s ease;
            -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
          }
          .play:hover{ transform: translateY(-1px); background: rgba(0,0,0,.42) }
          .play:focus-visible{ outline:2px solid #fff; outline-offset:2px }
          .play svg{ width:16px; height:16px }
  
          /* progress */
          .progress{
            position:absolute; left:50%; bottom: 1.1rem; transform: translateX(-50%);
            width: 160px; height: 3px; border-radius:999px; background: rgba(255,255,255,.35);
            overflow:hidden; z-index:3;
          }
          .bar{ height:100%; width:0%; background: #fff; transition: width .1s linear }
  
          /* touch area (for swipe) */
          .touch{ position:absolute; inset:0; z-index:4; }
  
          @media (max-width: 768px){
            :host{ --banner-height: 40vh; --banner-min-height: 280px; }
          }
          @media (max-width: 480px){
            :host{ --banner-height: 35vh; --banner-min-height: 250px; }
          }
        </style>
  
        <div class="wrap" part="wrap">
          <div class="slides" part="slides"></div>
  
          <!-- controls -->
          <button class="arrow prev" part="prev" aria-label="Previous slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button class="arrow next" part="next" aria-label="Next slide">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <button class="play" part="play" aria-label="Pause autoplay" aria-pressed="true">
            <svg id="playico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14"></rect><rect x="14" y="5" width="4" height="14"></rect>
            </svg>
          </button>
  
          <div class="progress" part="progress" hidden>
            <div class="bar" part="bar"></div>
          </div>
  
          <div class="dots" part="dots" aria-label="Slide navigation"></div>
          <div class="touch" aria-hidden="true"></div>
        </div>
      `;
      this.shadowRoot.appendChild(root);
  
      // refs
      const $ = (s)=> this.shadowRoot.querySelector(s);
      this.wrap = $(".wrap");
      this.slidesEl = this.shadowRoot.querySelector(".slides");
      this.dotsEl = this.shadowRoot.querySelector(".dots");
      this.touchEl = this.shadowRoot.querySelector(".touch");
      this.prevBtn = this.shadowRoot.querySelector(".prev");
      this.nextBtn = this.shadowRoot.querySelector(".next");
      this.playBtn = this.shadowRoot.querySelector(".play");
      this.playIco = this.shadowRoot.querySelector("#playico");
      this.progressWrap = this.shadowRoot.querySelector(".progress");
      this.progressBar = this.shadowRoot.querySelector(".bar");
  
      // swipe
      this._startX = 0;
      this._endX = 0;
  
      // visibility (pause when offscreen)
      this._io = new IntersectionObserver((entries)=>{
        const on = entries[0]?.isIntersecting;
        if (on) this._arm(); else this._disarm();
      }, { threshold: .15 });
  
      // page visibility
      document.addEventListener("visibilitychange", () => {
        if (document.hidden) this._disarm(); else this._arm();
      });
    }
  
    /* attributes */
    attributeChangedCallback(name, _old, val){
      if (name === "data" && val){
        try { this.setSlides(JSON.parse(val)); } catch {}
      }
      if (name === "interval"){ const n=+val; if(!Number.isNaN(n)) this._interval = Math.max(1200, n); this._arm(true); }
      if (name === "height"){ this.style.setProperty("--banner-height", val); }
      if (name === "min-height"){ this.style.setProperty("--banner-min-height", val); }
      if (name === "overlay"){ this._overlay = val || this._overlay; this.style.setProperty("--overlay", this._overlay); }
      if (name === "autoplay"){ this._autoplay = (val !== "false"); this._syncPlayUI(); this._arm(true); }
      if (name === "pause-on-hover"){ this._pauseOnHover = (val !== "false"); }
      if (name === "show-dots"){ this._showDots = (val !== "false"); this._buildDots(); }
      if (name === "show-arrows"){ this._showArrows = (val !== "false"); this._toggleArrows(); }
      if (name === "show-play"){ this._showPlay = (val !== "false"); this._togglePlay(); }
      if (name === "show-progress"){ this._showProgress = (val !== "false"); this._toggleProgress(); }
    }
  
    connectedCallback(){
      // hover pause
      this.wrap.addEventListener("mouseenter", ()=> this._pauseOnHover && this._disarm());
      this.wrap.addEventListener("mouseleave", ()=> this._pauseOnHover && this._arm());
  
      // keyboard nav (when focused inside)
      this.shadowRoot.addEventListener("keydown", (e)=>{
        if (e.key === "ArrowRight") this.next();
        if (e.key === "ArrowLeft")  this.prev();
        if (e.key.toLowerCase() === " "){ e.preventDefault(); this._togglePlayState(); }
      });
  
      // swipe
      this.touchEl.addEventListener("touchstart", (e)=>{ this._startX = e.touches[0].clientX; }, { passive:true });
      this.touchEl.addEventListener("touchend",   (e)=>{ this._endX   = e.changedTouches[0].clientX; this._handleSwipe(); }, { passive:true });
  
      // observe visibility
      this._io.observe(this);
  
      // controls
      this.prevBtn.addEventListener("click", ()=> { this.prev(); this._arm(true); });
      this.nextBtn.addEventListener("click", ()=> { this.next(); this._arm(true); });
      this.playBtn.addEventListener("click", ()=> this._togglePlayState());
  
      // initial UI states
      this._toggleArrows();
      this._togglePlay();
      this._toggleProgress();
  
      if (this._slides.length) {
        this._render();
      }
    }
  
    disconnectedCallback(){
      this._io.disconnect();
      this._disarm();
    }
  
    /* public API */
    setSlides(slides){
      if (!Array.isArray(slides)) return;
      this._slides = slides;
      this._i = 0;
      this._render();
      this._arm(true);
    }
    next(){ this.go(this._i + 1); }
    prev(){ this.go(this._i - 1); }
    go(to){
      if (!this._slides.length) return;
      this._i = (to + this._slides.length) % this._slides.length;
      this._show(this._i);
      this.dispatchEvent(new CustomEvent("slide-change", { detail:{ index: this._i }, bubbles:true, composed:true }));
      this._restartProgress();
    }
    play(){ this._autoplay = true; this.setAttribute("autoplay","true"); this._syncPlayUI(); this._arm(true); }
    pause(){ this._autoplay = false; this.setAttribute("autoplay","false"); this._syncPlayUI(); this._disarm(); }
  
    /* internals */
    _render(){
      // slides
      this.slidesEl.innerHTML = "";
      this._slides.forEach((s, idx)=>{
        const node = document.createElement("div");
        node.className = "slide";
        node.setAttribute("part", "slide");
        node.setAttribute("role", "group");
        node.setAttribute("aria-roledescription", "slide");
        node.setAttribute("aria-label", `${idx+1} of ${this._slides.length}`);
  
        // media
        if (s.video){
          const vid = document.createElement("video");
          vid.className = "video";
          vid.muted = true; vid.loop = true; vid.playsInline = true; vid.preload = "metadata";
          if (s.poster) vid.poster = s.poster;
          vid.src = s.video;
          node.appendChild(vid);
        } else if (s.image){
          node.style.backgroundImage = `url("${s.image}")`;
        }
  
        // overlay + content
        const overlay = document.createElement("div");
        overlay.className = "overlay";
        const content = document.createElement("div");
        content.className = "content";
        content.innerHTML = `
          ${s.badge ? `<div class="badge">${s.badge}</div>` : ""}
          ${s.title ? `<h1 class="title">${s.title}</h1>` : ""}
          ${s.subtitle ? `<p class="sub">${s.subtitle}</p>` : ""}
        `;
        overlay.appendChild(content);
        node.appendChild(overlay);
  
        this.slidesEl.appendChild(node);
      });
  
      this._buildDots();
      this._show(0, true);
      this._restartProgress(true);
    }
  
    _buildDots(){
      this.dotsEl.innerHTML = "";
      const multi = this._slides.length > 1;
      if (!this._showDots || !multi) { this.dotsEl.style.display = "none"; return; }
      this.dotsEl.style.display = "flex";
      this._slides.forEach((_, i)=>{
        const b = document.createElement("button");
        b.className = "dot";
        b.type = "button";
        b.setAttribute("aria-label", `Go to slide ${i+1}`);
        b.addEventListener("click", ()=> { this.go(i); this._arm(true); });
        this.dotsEl.appendChild(b);
      });
    }
  
    _toggleArrows(){
      const show = this._showArrows && this._slides.length > 1;
      this.prevBtn.style.display = show ? "grid" : "none";
      this.nextBtn.style.display = show ? "grid" : "none";
    }
  
    _togglePlay(){
      this.playBtn.style.display = this._showPlay ? "grid" : "none";
      this._syncPlayUI();
    }
  
    _toggleProgress(){
      const show = this._showProgress && this._slides.length > 1;
      this.progressWrap.hidden = !show;
      if (!show) this._stopProgress();
    }
  
    _syncPlayUI(){
      const playing = !!this._autoplay && !this._reduced;
      this.playBtn.setAttribute("aria-pressed", playing ? "true" : "false");
      this.playBtn.setAttribute("aria-label", playing ? "Pause autoplay" : "Play autoplay");
      // icon: pause (||) when playing, triangle when paused
      this.playIco.innerHTML = playing
        ? `<rect x="6" y="5" width="4" height="14"></rect><rect x="14" y="5" width="4" height="14"></rect>`
        : `<path d="M8 5l11 7-11 7z"></path>`;
    }
  
    _show(idx, instant=false){
      const slides = Array.from(this.slidesEl.children);
      const dots   = Array.from(this.dotsEl.children);
      slides.forEach((el,k)=>{
        el.classList.toggle("active", k === idx);
        // play/pause videos
        const v = el.querySelector("video");
        if (v){
          if (k === idx){
            if (this._autoplay && !this._reduced) v.play().catch(()=>{});
          } else {
            v.pause();
          }
        }
      });
      dots.forEach((d,k)=> d.classList.toggle("active", k === idx));
  
      if (instant){
        slides[idx]?.offsetWidth; // force reflow
      }
    }
  
    _togglePlayState(){
      if (this._autoplay) this.pause(); else this.play();
    }
  
    _arm(reset=false){
      if (!this.isConnected) return;
      if (!this._autoplay || this._reduced || this._slides.length <= 1) {
        this._disarm();
        return;
      }
      if (reset) this._disarm();
      if (!this._timer) this._timer = setInterval(()=> this.next(), this._interval);
      this._startProgress(reset);
    }
  
    _disarm(){
      if (this._timer){ clearInterval(this._timer); this._timer = null; }
      this._stopProgress();
      // also pause current video when explicitly paused
      const active = this.slidesEl.children[this._i];
      const v = active?.querySelector("video");
      if (v) v.pause();
    }
  
    /* progress logic */
    _restartProgress(initial=false){
      if (!this._showProgress) return;
      if (initial) { this._startProgress(true); return; }
      this._startProgress(true);
    }
    _startProgress(reset=false){
      if (!this._showProgress) return;
      if (reset) this._stopProgress(true);
      const start = performance.now();
      const dur = this._interval;
      const step = () => {
        if (!this._progressTimer) return; // stopped
        const t = Math.min(1, (performance.now() - start) / dur);
        this.progressBar.style.width = (t * 100).toFixed(1) + "%";
        if (t >= 1) return; // will reset when slide changes
        this._progressTimer = requestAnimationFrame(step);
      };
      this._progressTimer = requestAnimationFrame(step);
    }
    _stopProgress(resetWidth=false){
      if (this._progressTimer){ cancelAnimationFrame(this._progressTimer); this._progressTimer = null; }
      if (resetWidth && this.progressBar) this.progressBar.style.width = "0%";
    }
  
    _handleSwipe(){
      const diff = this._startX - this._endX;
      const TH = 50;
      if (Math.abs(diff) > TH) {
        this[ diff > 0 ? "next" : "prev" ]();
        this._arm(true);
      }
    }
  }
  
  customElements.define("berryella-banner", BerryellaBanner);
  