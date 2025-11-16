// lux-products.js
class LuxProducts extends HTMLElement {
  static get observedAttributes() {
    return ["data", "title", "subtitle", "float-interval", "float-max"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this._items = [];
    this._title = "LUXE COLLECTION";
    this._subtitle =
      "Discover our meticulously crafted skincare essentials, where science meets luxury in perfect harmony";
    this._floatInterval = 1000; // ms
    this._floatMax = 12;

    // search state
    this._query = "";
    this._suggestions = [];
    this._activeIdx = -1; // for keyboard navigation

    const el = document.createElement("div");
    el.innerHTML = `
      <style>
        :host{
          display:block;
          --fg:#111;
          --bg:#000;
          --muted:#6b7280;
          --gold:#ffd700;
          --accent:#000; /* add button */
          --accent-2:#111; /* hover */
          --price:#111;
          font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
          color:#fff;
        }
        .section{ position:relative; overflow: clip; border-radius:20px; }
        /* prevent clipping when suggestions are open */
        .section.sugg-open { overflow: visible; }

        .head{ position:relative;  text-align:center; margin:0 auto 2rem; max-width:72rem;
               display:flex; flex-direction:column; gap:1rem; align-items:center; }

        /* Search */
        .search-wrap{
          position:relative;
          width:min(720px, 92vw);
          z-index: 3; /* stay above cards/shimmers */
        }
        .search {
          width:100%;
          background: #0b0b0b;
          color:#e5e7eb;
          border:1px solid #1f2937;
          border-radius:999px;
          padding:.9rem 2.5rem .9rem 1.1rem;
          font-size:16px; /* avoid iOS zoom */
          outline: none;
          transition:border-color .2s ease, box-shadow .2s ease;
        }
        .search::placeholder{ color:#6b7280; }
        .search:focus{ border-color:#4b5563; box-shadow: 0 0 0 4px rgba(75,85,99,.15); }

        .clear-btn{
          position:absolute; right:.6rem; top:50%; transform: translateY(-50%);
          background:transparent; border:0; color:#9ca3af; cursor:pointer; font-size:20px; padding:.45rem; border-radius:999px;
          touch-action: manipulation;
        }
        .clear-btn:hover{ color:#e5e7eb; background:#111; }

        .sugg{
          position:absolute; left:0; right:0; top:calc(100% + .4rem);
          background:#0b0b0b; border:1px solid #1f2937; border-radius:16px; overflow:hidden;
          box-shadow: 0 16px 40px rgba(0,0,0,.35);
          display:none;
          max-height: 48vh; overflow-y:auto; scrollbar-width: thin;
        }
        .sugg.open{ display:block; }
        .sugg-item{
          display:flex; align-items:center; justify-content:space-between; gap:.6rem;
          padding:.9rem 1rem; font-size:.95rem; color:#e5e7eb; cursor:pointer; border-bottom:1px solid #111;
        }
        .sugg-item:last-child{ border-bottom:0 }
        .sugg-item[aria-selected="true"], .sugg-item:hover{
          background:#111827;
        }
        .sugg-title{ text-align:left; }
        .sugg-price{ color:#9ca3af; font-size:.9rem; }
        mark{ background:transparent; color:#f59e0b; font-weight:500; }

        .headline{
          font-family: "Playfair Display", serif;
          font-weight:300;
          font-size: clamp(2rem, 6vw, 3.75rem);
          letter-spacing:.18em;
        }
        .sub{ color:#d1d5db; font-weight:300; font-size: clamp(1rem, 2.4vw, 1.25rem); max-width: 48rem; margin: 0 auto; line-height:1.7; }

        /* grid */
        .grid{ position:relative; z-index:1; display:grid; gap:1.5rem; max-width:72rem; margin:0 auto; }
        @media (min-width: 0px){    .grid{ grid-template-columns: 1fr } }
        @media (min-width: 768px){  .grid{ grid-template-columns: repeat(3, 1fr) } }
        @media (min-width: 1024px){ .grid{ grid-template-columns: repeat(4, 1fr) } }

        /* empty state */
        .empty{ color:#9ca3af; text-align:center; padding:2rem 1rem; }

        /* card */
        .card{
          background: linear-gradient(145deg, #ffffff 0%, #fefefe 50%, #f9fafb 100%);
          border-radius: 24px;
          color:#111;
          overflow:hidden;
          position:relative;
          box-shadow:
            0 32px 64px -12px rgba(0,0,0,.08),
            0 8px 32px -8px rgba(0,0,0,.04),
            0 0 0 1px rgba(255,255,255,.9),
            inset 0 1px 0 rgba(255,255,255,.9);
          transition: transform .5s cubic-bezier(.4,0,.2,1), box-shadow .5s cubic-bezier(.4,0,.2,1);
        }
        .card::before{
          content:""; position:absolute; left:0; right:0; top:0; height:2px; z-index:2;
          background: linear-gradient(90deg, transparent 0%,
            rgba(255,215,0,.3) 25%, rgba(255,255,255,.8) 50%, rgba(255,215,0,.3) 75%, transparent 100%);
        }
        .card::after{
          content:""; position:absolute; inset:0; border-radius:24px; padding:1px; pointer-events:none;
          background: linear-gradient(145deg, rgba(255,255,255,.8) 0%, rgba(255,215,0,.1) 25%, transparent 50%, rgba(255,215,0,.1) 75%, rgba(255,255,255,.8) 100%);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
                  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
        }
        .card:hover{
          transform: translateY(-12px) scale(1.03);
          box-shadow:
            0 48px 100px -12px rgba(0,0,0,.12),
            0 16px 48px -8px rgba(0,0,0,.08),
            0 0 0 1px rgba(255,255,255,.95),
            inset 0 2px 0 rgba(255,255,255,.95);
        }

        .media{
          height: 12rem; position:relative; display:flex; align-items:center; justify-content:center;
          background: linear-gradient(135deg, var(--from,#fce7f3) 0%, var(--to,#e9d5ff) 100%);
          overflow:hidden;
        }
        .emoji{ font-size: clamp(3rem, 6vw, 4.5rem); filter: drop-shadow(0 12px 32px rgba(0,0,0,.18)); transform: translateZ(0) }
        .media img{ width:66%; height:66%; object-fit:contain; filter: drop-shadow(0 12px 32px rgba(0,0,0,.18)); }

        .shimmer::before{
          content:""; position:absolute; inset:-50% -50% auto auto; width:200%; height:200%;
          background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,.35) 50%, transparent 70%);
          animation: shimmer 3s infinite;
        }
        @keyframes shimmer{
          0%{ transform: translate(-100%, -100%) rotate(45deg); }
          100%{ transform: translate(100%, 100%) rotate(45deg); }
        }

        .badge{
          position:absolute; top:12px; right:12px; z-index:1;
          background: linear-gradient(135deg, rgba(0,0,0,.8), rgba(0,0,0,.6));
          color:#fff; border:1px solid rgba(255,255,255,.22);
          padding:.35rem .7rem; border-radius:999px; font-size:.72rem; font-weight:300; letter-spacing:.12em;
          backdrop-filter: blur(10px);
        }

        .body{ padding: 1.25rem; background: linear-gradient(180deg,#fff,#f7fafc); }
        .title{ font-size:1.05rem; font-weight:300; letter-spacing:.06em; margin:0 0 .25rem; color:#111 }
        .desc{ color:#4b5563; font-size:.8rem; line-height:1.6; margin:.1rem 0 .85rem }
        .meta{ display:flex; align-items:center; justify-content:space-between; margin-bottom:.9rem }
        .stars{ color:#f59e0b; font-size:.9rem; letter-spacing:.08em; display:flex; align-items:center; gap:.35rem }
        .count{ color:#6b7280; font-size:.72rem }
        .price{ color:var(--price); font-weight:300; font-size:1.25rem }

        .actions{ display:flex; gap:.5rem }
        .btn{
          appearance:none; border:1px solid #e5e7eb; background:#fff; color:#374151;
          padding:.55rem 1rem; border-radius:999px; font-size:.72rem; font-weight:300; letter-spacing:.12em; cursor:pointer;
          transition: transform .25s ease, box-shadow .25s ease, background .25s ease, color .25s ease, border-color .25s ease;
        }
        .btn:hover{ transform: translateY(-2px); border-color:#000; color:#000; box-shadow: 0 10px 24px rgba(0,0,0,.12) }
        .btn--primary{ flex:1; background:var(--accent); color:#fff; border-color: #000; }
        .btn--primary:hover{ background:var(--accent-2) }
        .btn.added{ background:#059669 !important; border-color:#059669 !important; color:#fff !important; }

        /* float layer */
        .float-layer{ position:absolute; inset:0; z-index:0; pointer-events:none; }
        .float{
          position:absolute; bottom:-50px; opacity:0; font-size: clamp(2rem, 3.2vw, 1.9rem);
          text-shadow:0 0 10px rgba(255,255,255,.25);
          animation: rise var(--dur,10s) linear forwards;
        }
        @keyframes rise{
          0%{ transform: translateY(0) rotate(0) translateX(0); opacity:0 }
          10%{ opacity:1 }
          90%{ opacity:1 }
          100%{ transform: translateY(calc(-100vh - 120px)) rotate(360deg) translateX(var(--drift,0px)); opacity:0 }
        }

        /* modal */
        .modal{ position: fixed; inset:0; display:none; align-items:center; justify-content:center; z-index:999999;
          background: rgba(0,0,0,.5); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px);
        }
        .modal.open{ display:flex; }
        .sheet{
          background:#fff; color:#111; border-radius: 24px; padding: 2rem; max-width: 48rem; width: min(92vw, 720px);
          transform: scale(.96); opacity:0; transition: transform .3s ease, opacity .3s ease; position:relative;
        }
        .modal.open .sheet{ transform: scale(1); opacity:1; }
        .x{ position:absolute; right:16px; top:12px; border:0; background:transparent; color:#9ca3af; font-size: 26px; cursor:pointer }
        .x:hover{ color:#111 }
        .sheet h2{ font-family:"Playfair Display",serif; font-weight:300; font-size: clamp(1.6rem, 3vw, 2.2rem); margin: 0 0 .25rem }
        .sheet .big{ font-weight:300; font-size: clamp(1.6rem, 3vw, 2.2rem); margin:.25rem 0 1rem }
        .sheet p{ color:#4b5563; line-height:1.7; }
        .details-grid{ display:grid; grid-template-columns: 1fr 1fr; gap: .9rem; margin-top:1rem; font-size:.9rem }
        .sheet .cta{ display:flex; gap:.6rem; margin-top:1rem }
        .cta .btn{ padding:.75rem 1.1rem; }

        /* --- Mobile fine-tuning --- */
        @media (max-width: 640px){
          .head{ align-items: stretch; gap:.75rem; }
          .search-wrap{ width:100%; }
          .sugg{ left:0; right:0; max-height:50vh; border-radius:14px; }
          .sugg-item{ padding:.9rem 1rem; }
        }
        @media (max-width: 400px){
          .section{ padding: 3.5rem 1rem; }
          .headline{ letter-spacing:.12em; }
          .sub{ font-size:.95rem; }
        }
      </style>

      <section class="section">
        <div class="pattern" aria-hidden="true"></div>
        <div class="float-layer" aria-hidden="true"></div>

        <div class="head">
        

          <h2 class="headline" id="title"></h2>
            <!-- Search row -->
          <div class="search-wrap" id="search-wrap"
               role="combobox" aria-haspopup="listbox" aria-owns="suggest" aria-expanded="false">
            <input id="search" class="search" type="search" placeholder="Search products, ingredients, skin type…"
                   autocomplete="off" aria-autocomplete="list" aria-controls="suggest" />
            <button class="clear-btn" id="clear-btn" title="Clear" aria-label="Clear search">&times;</button>
            <div class="sugg" id="suggest" role="listbox" tabindex="-1"></div>
          </div>
          <p class="sub" id="subtitle"></p>
        </div>

        <div class="grid" id="grid" role="list"></div>

        <!-- modal -->
        <div class="modal" id="modal" aria-modal="true" role="dialog">
          <div class="sheet" role="document">
            <button class="x" aria-label="Close">&times;</button>
            <div id="modal-content"></div>
          </div>
        </div>
      </section>
    `;
    this.shadowRoot.appendChild(el);

    // refs
    const $ = (s) => this.shadowRoot.querySelector(s);
    this.$section = this.shadowRoot.querySelector(".section");
    this.$t = $("#title");
    this.$s = $("#subtitle");
    this.$grid = $("#grid");
    this.$float = this.shadowRoot.querySelector(".float-layer");
    this.$modal = $("#modal");
    this.$modalContent = $("#modal-content");

    // search refs
    this.$searchWrap = $("#search-wrap");
    this.$search = $("#search");
    this.$suggest = $("#suggest");
    this.$clear = $("#clear-btn");

    // modal close handlers
    this.$modal.addEventListener("click", (e) => {
      if (e.target === this.$modal || e.target.classList.contains("x")) this._closeModal();
    });

    // floats
    this._emojis = ["🫐","🍓","🍒","🍃","🌿","🍀","🌱","🌸","🌺","🌻"];
    this._floatTimer = null;
    this._floating = new Set();

    // search events
    this._bindSearchEvents();
  }

  /* attrs */
  attributeChangedCallback(name, _old, val) {
    if (name === "data" && val) {
      try { this.setItems(JSON.parse(val)); } catch {}
    }
    if (name === "title")    { this._title = val || this._title;       this._renderHeader(); }
    if (name === "subtitle") { this._subtitle = val || this._subtitle; this._renderHeader(); }
    if (name === "float-interval") { const n=+val; if(!Number.isNaN(n)) this._floatInterval = Math.max(250,n); }
    if (name === "float-max")      { const n=+val; if(!Number.isNaN(n)) this._floatMax = Math.max(0,n); }
  }

  connectedCallback(){
    this._renderHeader();
    this._renderGrid();
    this._startFloating();
  }
  disconnectedCallback(){ this._stopFloating(true); }

  /* public */
  setItems(items){
    if (!Array.isArray(items)) return;
    this._items = items;
    this._renderGrid();
    if (this._query) this._updateSuggestions(this._query);
  }

  /* render */
  _renderHeader(){
    this.$t.textContent = this._title;
    this.$s.textContent = this._subtitle;
  }

  _renderGrid(){
    const items = this._filterList(this._items, this._query);
    this.$grid.innerHTML = "";

    if (!items.length) {
      const q = this._escape(this._query);
      this.$grid.innerHTML = `<div class="empty">No results for “${q}”. Try different keywords.</div>`;
      return;
    }

    const palette = [
      ["#fce7f3","#e9d5ff"], ["#dcfce7","#bae6fd"], ["#fef9c3","#fed7aa"],
      ["#e9d5ff","#c7d2fe"], ["#fee2e2","#fecaca"], ["#fafaf9","#e7e5e4"]
    ];

    items.forEach((p, i) => {
      const from = p.gradient?.[0] || palette[i % palette.length][0];
      const to   = p.gradient?.[1] || palette[i % palette.length][1];
      const h    = p.mediaHeight ? Number(p.mediaHeight) : 192;

      const rating = typeof p.rating === "number" ? Math.max(0, Math.min(5, p.rating)) : 5;
      const stars = "★★★★★".slice(0, Math.round(rating));
      const count = p.reviews != null ? `(${p.reviews})` : "";
      const price = typeof p.price === "number" ? `$${p.price}` : (p.price || "");

      const card = document.createElement("article");
      card.className = "card";
      card.setAttribute("role", "listitem");
      card.innerHTML = `
        <div class="media shimmer" style="--from:${from};--to:${to};height:${h}px">
          ${p.image
            ? `<img src="${p.image}" alt="${(p.title||"").replace(/"/g,"&quot;")}" loading="lazy" decoding="async">`
            : `<div class="emoji">${p.emoji || "💎"}</div>`}
          ${p.badge ? `<div class="badge">${p.badge}</div>` : ""}
        </div>
        <div class="body">
          <div class="mb">
            <h3 class="title">${this._highlight(p.title || "", this._query)}</h3>
            <p class="desc">${this._highlight(p.description || "", this._query)}</p>
          </div>

          <div class="meta">
            <div class="stars" aria-label="Rating ${rating} out of 5">
              <span>${stars}</span><span class="count">${count}</span>
            </div>
            <span class="price">${price}</span>
          </div>

          <div class="actions">
            <button class="btn btn--primary" type="button">ADD</button>
            <button class="btn" type="button">DETAILS</button>
          </div>
        </div>
      `;

      const [addBtn, detailsBtn] = card.querySelectorAll(".btn");
      addBtn.addEventListener("click", () => {
        const was = addBtn.textContent;
        addBtn.textContent = "ADDED";
        addBtn.classList.add("added");
        setTimeout(() => { addBtn.textContent = was; addBtn.classList.remove("added"); }, 1600);

        this.dispatchEvent(new CustomEvent("add-to-cart", {
          detail: { product: p, index: i },
          bubbles: true, composed: true
        }));
      });

      detailsBtn.addEventListener("click", () => {
        this._openModal(`
          <h2>${p.title || ""}</h2>
          <div class="big">${price}</div>
          <p>${p.description || "Premium skincare crafted with rare actives and botanicals."}</p>
          <div class="details-grid">
            <div><strong>Key Ingredients:</strong> ${p.ingredients || "Premium botanical extracts"}</div>
            <div><strong>Skin Type:</strong> ${p.skinType || "All skin types"}</div>
            <div><strong>Size:</strong> ${p.size || "30ml / 1.0 fl oz"}</div>
            <div><strong>Origin:</strong> ${p.origin || "Swiss laboratory"}</div>
          </div>
          <div class="cta">
            <button class="btn btn--primary" type="button" id="m-add">ADD TO COLLECTION</button>
            <button class="btn" type="button" id="m-wish">WISHLIST</button>
          </div>
        `);

        this.$modalContent.querySelector("#m-add")?.addEventListener("click", () => {
          this.dispatchEvent(new CustomEvent("add-to-cart", {
            detail: { product: p, index: i, from: "modal" },
            bubbles: true, composed: true
          }));
          this._closeModal();
        });
        this.$modalContent.querySelector("#m-wish")?.addEventListener("click", () => {
          this.dispatchEvent(new CustomEvent("wishlist", {
            detail: { product: p, index: i },
            bubbles: true, composed: true
          }));
          this._closeModal();
        });
      });

      this.$grid.appendChild(card);
    });
  }

  /* modal */
  _openModal(innerHtml){
    this.$modalContent.innerHTML = innerHtml;
    this.$modal.classList.add("open");
  }
  _closeModal(){
    this.$modal.classList.remove("open");
  }

  /* float emojis */
  _startFloating(){
    this._stopFloating(true);
    this._floatTimer = setInterval(()=> this._spawnFloat(), this._floatInterval);
    for (let i=0;i<5;i++) this._spawnFloat();
  }
  _stopFloating(clear=false){
    if (this._floatTimer){ clearInterval(this._floatTimer); this._floatTimer = null; }
    if (clear){ this._floating.forEach(n=>n.remove()); this._floating.clear(); }
  }
  _spawnFloat(){
    if (this._floating.size >= this._floatMax) return;
    const el = document.createElement("div");
    el.className = "float";
    el.textContent = this._emojis[Math.floor(Math.random()*this._emojis.length)];
    el.style.left = (Math.random()*90) + "%";
    el.style.setProperty("--drift", ((Math.random()-0.5)*200).toFixed(0) + "px");
    el.style.setProperty("--dur", (Math.random()*7+8).toFixed(2) + "s");
    el.addEventListener("animationend", () => { this._floating.delete(el); el.remove(); });
    this._floating.add(el);
    this.$float.appendChild(el);
  }

  /* ---------- SEARCH & SUGGESTIONS ---------- */

  _bindSearchEvents(){
    // input typing (debounced)
    let t;
    this.$search.addEventListener("input", (e) => {
      const q = e.currentTarget.value.trim();
      clearTimeout(t);
      t = setTimeout(() => this._onQuery(q), 120);
    });

    // focus/blur to open/close panel
    this.$search.addEventListener("focus", () => {
      if (this._suggestions.length) this._openSuggest();
    });
    // close on click outside (respect shadow DOM)
    this.shadowRoot.addEventListener("click", (e) => {
      const inside = e.composedPath().includes(this.$searchWrap);
      if (!inside) this._closeSuggest();
    });

    // keyboard navigation
    this.$search.addEventListener("keydown", (e) => {
      const has = this._suggestions.length > 0;
      if (!has) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        this._moveActive(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this._moveActive(-1);
      } else if (e.key === "Enter") {
        if (this._activeIdx >= 0) {
          e.preventDefault();
          const item = this._suggestions[this._activeIdx];
          this._chooseSuggestion(item);
        }
      } else if (e.key === "Escape") {
        this._closeSuggest();
      }
    });

    // clear button
    this.$clear.addEventListener("click", () => {
      this.$search.value = "";
      this._query = "";
      this._activeIdx = -1;
      this._suggestions = [];
      this._renderGrid();
      this._renderSuggestions();
      this._closeSuggest();
      this.$search.focus();
    });
  }

  _onQuery(q){
    this._query = q;
    this._updateSuggestions(q);
    this._renderGrid();
    if (q && this._suggestions.length) this._openSuggest(); else this._closeSuggest();
  }

  _updateSuggestions(q){
    if (!q) {
      this._suggestions = [];
      this._activeIdx = -1;
      this._renderSuggestions();
      return;
    }
    const norm = q.toLowerCase();
    // score: title>ingredients>description>skinType (+2 bonus if startsWith in title)
    const scored = this._items.map((p, idx) => {
      let score = 0;
      const title = (p.title || "").toLowerCase();
      const ing   = (p.ingredients || "").toLowerCase();
      const desc  = (p.description || "").toLowerCase();
      const skin  = (p.skinType || "").toLowerCase();
      if (title.includes(norm)) score += 4;
      if (ing.includes(norm))   score += 2;
      if (desc.includes(norm))  score += 1;
      if (skin.includes(norm))  score += 1;
      if (title.startsWith(norm)) score += 2;
      return { p, idx, score };
    }).filter(x => x.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0, 8);

    this._suggestions = scored.map(x => x.p);
    this._activeIdx = this._suggestions.length ? 0 : -1;
    this._renderSuggestions();
  }

  _renderSuggestions(){
    const q = this._query;
    if (!this._suggestions.length) {
      this.$suggest.innerHTML = "";
      this.$searchWrap.setAttribute("aria-expanded", "false");
      return;
    }
    const html = this._suggestions.map((p, i) => {
      const price = typeof p.price === "number" ? `$${p.price}` : (p.price || "");
      return `
        <div class="sugg-item" role="option" data-idx="${i}" aria-selected="${i===this._activeIdx}">
          <div class="sugg-title">${this._highlight(p.title || "", q)}</div>
          <div class="sugg-price">${price}</div>
        </div>
      `;
    }).join("");

    this.$suggest.innerHTML = html;
    this.$suggest.querySelectorAll(".sugg-item").forEach(el => {
      el.addEventListener("mouseenter", () => {
        const i = Number(el.getAttribute("data-idx"));
        this._activeIdx = i;
        this._syncActive();
      });
      el.addEventListener("mousedown", (e) => {
        // prevent input blur before click
        e.preventDefault();
      });
      el.addEventListener("click", () => {
        const i = Number(el.getAttribute("data-idx"));
        const item = this._suggestions[i];
        this._chooseSuggestion(item);
      });
    });
  }

  _chooseSuggestion(item){
    const text = item?.title || this._query;
    this.$search.value = text;
    this._query = text;
    this._updateSuggestions(text);
    this._renderGrid();
    this._closeSuggest();

    this.dispatchEvent(new CustomEvent("search-select", {
      detail: { query: text, product: item },
      bubbles: true, composed: true
    }));
  }

  _moveActive(delta){
    const len = this._suggestions.length;
    if (!len) return;
    this._activeIdx = (this._activeIdx + delta + len) % len;
    this._syncActive();
  }

  _syncActive(){
    this.$suggest.querySelectorAll(".sugg-item").forEach((el, i) => {
      el.setAttribute("aria-selected", String(i === this._activeIdx));
      if (i === this._activeIdx) el.scrollIntoView({ block: "nearest" });
    });
  }

  _openSuggest(){
    this.$suggest.classList.add("open");
    this.$searchWrap.setAttribute("aria-expanded", "true");
    this.$section?.classList.add("sugg-open");   // prevent clipping on small screens
  }
  _closeSuggest(){
    this.$suggest.classList.remove("open");
    this.$searchWrap.setAttribute("aria-expanded", "false");
    this.$section?.classList.remove("sugg-open");
  }

  /* ---------- helpers ---------- */

  _filterList(list, q){
    if (!q) return list;
    const norm = q.toLowerCase();
    return list.filter(p => {
      const title = (p.title || "").toLowerCase();
      const desc  = (p.description || "").toLowerCase();
      const ing   = (p.ingredients || "").toLowerCase();
      const skin  = (p.skinType || "").toLowerCase();
      return title.includes(norm) || desc.includes(norm) || ing.includes(norm) || skin.includes(norm);
    });
  }

  _highlight(text, q){
    if (!q) return this._escape(text);
    const escQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return this._escape(text).replace(new RegExp(escQ, "ig"), (m) => `<mark>${m}</mark>`);
  }

  _escape(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
}

customElements.define("lux-products", LuxProducts);
