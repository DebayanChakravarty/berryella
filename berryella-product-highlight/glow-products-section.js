// glow-products-section.js
class GlowProductsSection extends HTMLElement {
    static get observedAttributes() { return ["data", "title", "subtitle", "float-interval", "float-max"]; }
  
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._items = [];
      this._title = "Our Products";
      this._subtitle = "Explore our curated collection of premium skincare essentials";
      this._floatInterval = 1000; // ms
      this._floatMax = 12;
  
      const wrap = document.createElement("div");
      wrap.innerHTML = `
        <style>
          :host{ display:block; --fg:#111; --bg:#000; --muted:#666; --accent:#ec4899; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
          .section{ padding: 4rem 1rem; color: #fff; position: relative; overflow: clip; }
          .head{ max-width: 72rem; margin: 0 auto 3rem; text-align:center }
          .head h3{ font-size: clamp(1.6rem, 2.8vw, 2.2rem); margin: 0 0 .5rem; }
          .head p{ color: #d1d5db; margin:0 auto; max-width: 40rem }
  
          /* Masonry (CSS columns) */
          .masonry { max-width: 72rem; margin: 0 auto; column-fill: balance; column-gap: 1.5rem; }
          @media (min-width: 0px){      .masonry{ column-count: 1 } }
          @media (min-width: 480px){    .masonry{ column-count: 2 } }
          @media (min-width: 768px){    .masonry{ column-count: 3 } }
          @media (min-width: 1024px){   .masonry{ column-count: 4 } }
  
          .card-wrap{ break-inside: avoid; margin: 0 0 1.5rem; display:inline-block; width:100% }
  
          .card{
            background: #fff; color: #111; border-radius: 1rem; overflow: hidden;
            box-shadow: 0 20px 40px rgba(0,0,0,.12);
            transition: transform .25s ease, box-shadow .25s ease;
          }
          .card:hover{ transform: translateY(-5px); box-shadow: 0 24px 50px rgba(0,0,0,.16); }
  
          .media{
            height: var(--h, 16rem);
            display:flex; align-items:center; justify-content:center;
            background: linear-gradient(135deg, var(--from,#fce7f3) 0%, var(--to,#e9d5ff) 100%);
          }
          .media .emoji{ font-size: clamp(3rem, 6vw, 4rem) }
  
          .body{ padding: 1.25rem; }
          .title{ font-weight: 700; font-size: 1.125rem; margin: 0 0 .25rem; }
          .desc{ color:#4b5563; font-size:.95rem; line-height:1.5; margin: 0 0 1rem }
          .bottom{ display:flex; align-items:center; justify-content:space-between; gap:.75rem }
          .price{ color:#db2777; font-weight: 800; font-size: 1.25rem }
          .btn{
            appearance:none; border:0; border-radius: 999px; padding:.55rem 1rem;
            background:#ec4899; color:#fff; font-weight:700; font-size:.95rem; cursor:pointer;
            transition: transform .15s ease, background .15s ease, box-shadow .15s ease;
          }
          .btn:hover{ transform: translateY(-1px); background:#db2777; box-shadow: 0 6px 14px rgba(236,72,153,.35) }
          .btn:active{ transform: translateY(0) }
          .btn.added{ background:#10b981; box-shadow: 0 6px 14px rgba(16,185,129,.35) }
  
          /* Floating emoji berries/leaves inside component */
          .float-layer{ position:absolute; inset:0; pointer-events:none; z-index:0; }
          .float{ position: absolute; bottom: -50px; font-size: clamp(2rem, 6vw, 3.6rem); opacity: 0; text-shadow: 0 0 10px rgba(255,255,255,.25) }
          @keyframes float {
            0%   { transform: translateY(0) rotate(0deg) translateX(0); opacity: 0 }
            10%  { opacity: 1 }
            90%  { opacity: 1 }
            100% { transform: translateY(calc(-100vh - 100px)) rotate(360deg) translateX(var(--drift, 0px)); opacity: 0 }
          }
        </style>
  
        <section class="section">
          <div class="float-layer" aria-hidden="true"></div>
  
          <div class="head">
            <h3 id="hdr"></h3>
            <p id="sub"></p>
          </div>
  
          <div class="masonry" id="grid"></div>
        </section>
      `;
      this.shadowRoot.appendChild(wrap);
  
      // refs
      this.$ = (s) => this.shadowRoot.querySelector(s);
      this.grid = this.$("#grid");
      this.hdr = this.$("#hdr");
      this.sub = this.$("#sub");
      this.floatLayer = this.$(".float-layer");
  
      // floating emoji config
      this._floatTimer = null;
      this._floating = new Set();
      this._emojis = ['🫐','🍓','🍒','🍃','🌿','🍀','🌱','🌸','🌺','🌻'];
    }
  
    /* ---------- Attributes ---------- */
    attributeChangedCallback(name, _old, val){
      if (name === "data" && val){
        try { this.setItems(JSON.parse(val)); } catch(_e){}
      }
      if (name === "title"){ this._title = val || this._title; this._renderHeader(); }
      if (name === "subtitle"){ this._subtitle = val || this._subtitle; this._renderHeader(); }
      if (name === "float-interval"){ const n = +val; if (!Number.isNaN(n)) this._floatInterval = Math.max(300, n); }
      if (name === "float-max"){ const n = +val; if (!Number.isNaN(n)) this._floatMax = Math.max(0, n); }
    }
  
    connectedCallback(){
      this._renderHeader();
      this._renderGrid();
      this._startFloating();
    }
  
    disconnectedCallback(){
      this._stopFloating(true);
    }
  
    /* ---------- Public API ---------- */
    setItems(items){
      if (!Array.isArray(items)) return;
      this._items = items;
      this._renderGrid();
    }
  
    /* ---------- Render ---------- */
    _renderHeader(){
      this.hdr.textContent = this._title;
      this.sub.textContent = this._subtitle;
    }
  
    _renderGrid(){
      const items = this._items || [];
      this.grid.innerHTML = "";
      const palette = [
        ["#fde2e2","#fef3c7"], ["#d1fae5","#bfdbfe"], ["#fce7f3","#e9d5ff"],
        ["#cffafe","#e9d5ff"], ["#fef9c3","#fed7aa"], ["#fee2e2","#fecaca"],
        ["#e9d5ff","#fde68a"], ["#dcfce7","#bae6fd"]
      ];
  
      items.forEach((p, idx)=>{
        const card = document.createElement("div");
        card.className = "card-wrap";
        const from = (p.gradient && p.gradient[0]) || palette[idx % palette.length][0];
        const to   = (p.gradient && p.gradient[1]) || palette[idx % palette.length][1];
        const h    = (p.mediaHeight && Number(p.mediaHeight)) || 256;
  
        const price = typeof p.price === "number" ? `$${p.price}` : (p.price || "");
  
        const media = p.image
          ? `<div class="media" style="--h:${h}px;--from:${from};--to:${to}"><img src="${p.image}" alt="" style="width:66%;height:66%;object-fit:contain;filter: drop-shadow(0 8px 24px rgba(0,0,0,.15))" loading="lazy" decoding="async"></div>`
          : `<div class="media" style="--h:${h}px;--from:${from};--to:${to}"><div class="emoji">${p.emoji || "🧴"}</div></div>`;
  
        card.innerHTML = `
          <article class="card">
            ${media}
            <div class="body">
              <h4 class="title">${p.title || ""}</h4>
              <p class="desc">${p.description || ""}</p>
              <div class="bottom">
                <span class="price">${price}</span>
                <button class="btn" type="button" aria-label="Add ${p.title || "product"} to cart">Add to Cart</button>
              </div>
            </div>
          </article>
        `;
  
        const btn = card.querySelector(".btn");
        btn.addEventListener("click", ()=>{
          // visual feedback
          const was = btn.textContent;
          btn.textContent = "Added!";
          btn.classList.add("added");
          setTimeout(()=>{ btn.textContent = was; btn.classList.remove("added"); }, 1400);
  
          // event for external cart systems
          this.dispatchEvent(new CustomEvent("add-to-cart", {
            detail: { product: p, index: idx },
            bubbles: true, composed: true
          }));
        });
  
        this.grid.appendChild(card);
      });
    }
  
    /* ---------- Floating emoji layer ---------- */
    _startFloating(){
      this._stopFloating(true);
      this._floatTimer = setInterval(()=> this._spawnFloat(), this._floatInterval);
      // seed a few
      for (let i=0; i<5; i++) this._spawnFloat();
    }
    _stopFloating(clear=false){
      if (this._floatTimer){ clearInterval(this._floatTimer); this._floatTimer = null; }
      if (clear){
        this._floating.forEach(el => el.remove());
        this._floating.clear();
      }
    }
    _spawnFloat(){
      if (this._floating.size >= this._floatMax) return;
      const el = document.createElement("div");
      el.className = "float";
      el.textContent = this._emojis[Math.floor(Math.random()*this._emojis.length)];
      const left = Math.random()*90; // vw-ish inside host
      el.style.left = left + "%";
      const drift = (Math.random()-0.5) * 200;
      el.style.setProperty("--drift", drift + "px");
      const dur = (Math.random()*7 + 8).toFixed(2) + "s";
      el.style.animation = `float ${dur} linear forwards`;
  
      // clean-up after animation
      el.addEventListener("animationend", ()=>{
        this._floating.delete(el);
        el.remove();
      });
      this._floating.add(el);
      this.floatLayer.appendChild(el);
    }
  }
  
  customElements.define("glow-products", GlowProductsSection);
  