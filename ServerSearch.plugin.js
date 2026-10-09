/**
 * @name ServerSearch
 * @author sutto4
 * @description Search your servers with icons and locally saved favorites. Ctrl+Shift+S to open.
 * @version 1.1.1
 * @website https://github.com/sutto4/BD-ServerSearch
 * @source https://github.com/sutto4/BD-ServerSearch/blob/main/ServerSearch.plugin.js
 */
module.exports = class ServerSearch {
    static normalize(value) {
        return String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLocaleLowerCase();
    }
    static filter(guilds, query, favorites, onlyFavorites) {
        const words = this.normalize(query).trim().split(/\s+/).filter(Boolean);
        return Object.values(guilds).filter(g => g && (!onlyFavorites || favorites.has(g.id)) &&
            words.every(word => this.normalize(g.name).includes(word)))
            .sort((a,b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    }
    static iconURL(guild) {
        if (!guild.icon || !guild.id) return null;
        return 'https://cdn.discordapp.com/icons/' + encodeURIComponent(guild.id) + '/' + encodeURIComponent(guild.icon) + '.png?size=64';
    }
    resolveNavigation() {
        const webpack = BdApi.Webpack;
        const guildNavigation = webpack.getByKeys('transitionToGuild');
        if (typeof guildNavigation?.transitionToGuild === 'function') return id => guildNavigation.transitionToGuild(id);
        const routes = webpack.getByKeys('transitionTo');
        if (typeof routes?.transitionTo === 'function') return id => routes.transitionTo('/channels/' + id);
        // Newer Discord builds rename exports. Match the internal route function's log string.
        const transition = webpack.getByStrings?.('transitionTo - Transitioning to ', {searchExports:true});
        if (typeof transition === 'function') return id => transition('/channels/' + id);
        return null;
    }
    async openServer(id) {
        try {
            this.navigation ||= this.resolveNavigation();
            if (!this.navigation) throw new Error('Internal navigation unavailable');
            await this.navigation(id);
            if (this.active) this.close(false);
        } catch (error) {
            this.navigation = null;
            console.error('[ServerSearch] Could not navigate to server', error);
            BdApi.UI.showToast('ServerSearch could not navigate internally. The client has not been reloaded.', {type:'error'});
        }
    }
    element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }
    avatar(guild) {
        const avatar = this.element('span', 'ss-avatar', Array.from(guild.name || '?').slice(0,2).join('').toUpperCase());
        avatar.setAttribute('aria-hidden', 'true');
        const url = ServerSearch.iconURL(guild);
        if (url) {
            const img = this.element('img', 'ss-icon');
            img.alt = '';
            img.width = img.height = 34;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.onload = () => { img.style.opacity = '1'; };
            img.onerror = () => { img.remove(); };
            img.src = url;
            avatar.append(img);
        }
        return avatar;
    }
    start() {
        this.stop();
        this.store = BdApi.Webpack.getStore('GuildStore');
        if (!this.store?.getGuilds) {
            BdApi.UI.showToast("ServerSearch: Discord's server store is unavailable. Try reloading Discord.", {type:'error'});
            return;
        }
        this.active = true;
        const saved = BdApi.Data.load('ServerSearch', 'favorites');
        this.favorites = new Set(Array.isArray(saved) ? saved.filter(id => typeof id === 'string') : []);
        this.onlyFavorites = false;
        this.navigation = null;
        BdApi.DOM.addStyle('ServerSearch', `
            #ss-launch { margin:8px auto; flex-shrink:0; width:44px; height:38px; border:0; border-radius:14px; background:var(--background-modifier-selected,#36373d); color:var(--text-normal,#eee); cursor:pointer; font:22px system-ui; }
            #ss-launch:hover { background:#5865f2; color:white; }
            #ss-panel { position:fixed; z-index:1001; width:min(340px,calc(100vw - 24px)); max-height:min(650px,calc(100vh - 80px)); display:flex; flex-direction:column; box-sizing:border-box; padding:16px; gap:12px; background:var(--background-floating,#202127); color:var(--text-normal,#eee); border:1px solid var(--background-modifier-accent,#45464e); border-radius:16px; box-shadow:0 16px 48px #0008; font:14px system-ui; }
            #ss-panel * { box-sizing:border-box; }
            #ss-panel header { display:flex; align-items:center; justify-content:space-between; }
            #ss-panel h2 { font-size:17px; font-weight:650; margin:0; }
            #ss-panel button { color:inherit; cursor:pointer; border:0; border-radius:8px; padding:7px 10px; background:var(--background-modifier-hover,#35363e); font:inherit; }
            #ss-panel button[aria-pressed="true"] { background:#5865f2; color:white; }
            #ss-panel input { width:100%; padding:11px 12px; border-radius:8px; border:1px solid #555660; background:var(--background-secondary,#292a30); color:inherit; font:inherit; }
            #ss-panel :focus-visible { outline:2px solid #8bafff; outline-offset:2px; }
            .ss-filters { display:flex; gap:8px; }
            #ss-count, .ss-help { color:var(--text-muted,#aaaeb8); font-size:12px; }
            #ss-results { overflow-y:auto; min-height:0; margin:0; padding:2px; list-style:none; scrollbar-width:thin; scrollbar-color:#60616c transparent; }
            .ss-row { display:flex; align-items:center; gap:6px; border-radius:9px; margin-bottom:4px; }
            .ss-row:hover, .ss-row:focus-within { background:var(--background-modifier-hover,#35363e); }
            #ss-panel button.ss-link { display:flex; align-items:center; gap:10px; min-width:0; flex:1; padding:8px; border-radius:8px; background:transparent; text-align:left; }
            .ss-avatar { position:relative; overflow:hidden; display:grid; place-items:center; flex-shrink:0; width:34px; height:34px; border-radius:11px; background:#41445e; color:white; font-size:12px; }
            #ss-panel .ss-icon { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; background:var(--background-floating,#202127); opacity:0; }
            .ss-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
            #ss-panel .ss-star { background:transparent; color:#f4ce72; font-size:20px; }
            .ss-empty { padding:24px 8px; text-align:center; color:var(--text-muted,#aaaeb8); }
        `);
        this.keyHandler = e => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyS' && !e.altKey && !e.repeat) {
                e.preventDefault(); this.panel ? this.close() : this.open();
            } else if (e.key === 'Escape' && this.panel) { e.preventDefault(); this.close(); }
        };
        this.outsideHandler = e => { if (this.panel && !this.panel.contains(e.target) && !this.launch?.contains(e.target)) this.close(false); };
        this.storeHandler = () => { if (this.panel) this.renderResults(); };
        document.addEventListener('keydown', this.keyHandler);
        document.addEventListener('pointerdown', this.outsideHandler);
        this.store.addChangeListener?.(this.storeHandler);
        this.mount();
        this.timer = setInterval(() => this.mount(), 1500);
    }
    mount() {
        if (!this.active || this.launch?.isConnected) return;
        const list = document.querySelector('[data-list-id="guildsnav"]');
        const nav = list?.closest('nav') || list?.parentElement;
        if (!nav) return;
        this.launch?.remove();
        this.launch = this.element('button', '', '⌕');
        this.launch.id = 'ss-launch';
        this.launch.title = 'Search servers (Ctrl+Shift+S)';
        this.launch.setAttribute('aria-label', 'Search servers');
        this.launch.setAttribute('aria-haspopup', 'dialog');
        this.launch.setAttribute('aria-expanded', String(!!this.panel));
        this.launch.onclick = () => this.panel ? this.close() : this.open();
        nav.prepend(this.launch);
    }
    open() {
        if (!this.active || this.panel) return;
        this.previousFocus = document.activeElement;
        const panel = this.panel = this.element('section');
        panel.id = 'ss-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Search servers');
        const header = this.element('header');
        const close = this.element('button', '', '×');
        close.setAttribute('aria-label', 'Close server search');
        close.onclick = () => this.close();
        header.append(this.element('h2', '', 'Your servers'), close);
        this.input = this.element('input');
        this.input.type = 'search';
        this.input.placeholder = 'Search servers…';
        this.input.setAttribute('aria-label', 'Search servers by name');
        this.input.oninput = () => this.renderResults();
        const filters = this.element('div', 'ss-filters');
        this.filterButtons = [false,true].map(favorite => {
            const button = this.element('button', '', favorite ? '★ Favorites' : 'All servers');
            button.onclick = () => { this.onlyFavorites = favorite; this.renderResults(); };
            filters.append(button); return button;
        });
        this.count = this.element('div'); this.count.id = 'ss-count'; this.count.setAttribute('role','status');
        this.results = this.element('ul'); this.results.id = 'ss-results';
        panel.append(header, this.input, filters, this.count, this.results, this.element('div','ss-help','↑ ↓ Browse · Enter Open · Esc Close'));
        panel.onkeydown = e => {
            const links = [...this.results.querySelectorAll('.ss-link')];
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const index = links.indexOf(document.activeElement);
                const next = index < 0 ? (e.key === 'ArrowDown' ? 0 : links.length-1) : (index+(e.key === 'ArrowDown' ? 1 : -1)+links.length)%links.length;
                links[next]?.focus();
            } else if (e.key === 'Enter' && e.target === this.input) { e.preventDefault(); links[0]?.click(); }
        };
        document.body.append(panel);
        this.positionHandler = () => {
            const rect = this.launch?.getBoundingClientRect();
            panel.style.left = Math.max(12,Math.min((rect?.right || 68)+12,window.innerWidth-panel.offsetWidth-12)) + 'px';
            panel.style.top = Math.max(12,Math.min(rect?.top || 48,window.innerHeight-panel.offsetHeight-12)) + 'px';
        };
        window.addEventListener('resize',this.positionHandler);
        this.renderResults(); this.launch?.setAttribute('aria-expanded','true'); this.input.focus();
    }
    renderResults() {
        const focusId = this.results.querySelector(':focus')?.closest('li')?.dataset.guildId;
        const focusStar = document.activeElement?.classList.contains('ss-star');
        const scroll = this.results.scrollTop;
        const guilds = ServerSearch.filter(this.store.getGuilds(),this.input.value,this.favorites,this.onlyFavorites);
        this.filterButtons.forEach((button,index) => button.setAttribute('aria-pressed',String(Boolean(index) === this.onlyFavorites)));
        this.count.textContent = guilds.length + ' server' + (guilds.length === 1 ? '' : 's');
        const fragment = document.createDocumentFragment();
        for (const guild of guilds) {
            const row = this.element('li','ss-row'); row.dataset.guildId = guild.id;
            const link = this.element('button','ss-link'); link.type = 'button'; link.title = guild.name;
            link.append(this.avatar(guild),this.element('span','ss-name',guild.name));
            link.onclick = e => { e.preventDefault(); this.openServer(guild.id); };
            const favorite = this.favorites.has(guild.id);
            const star = this.element('button','ss-star',favorite ? '★' : '☆');
            star.setAttribute('aria-label',(favorite ? 'Remove ' : 'Add ') + guild.name + (favorite ? ' from' : ' to') + ' favorites');
            star.setAttribute('aria-pressed',String(favorite));
            star.onclick = () => {
                favorite ? this.favorites.delete(guild.id) : this.favorites.add(guild.id);
                BdApi.Data.save('ServerSearch','favorites',[...this.favorites]); this.renderResults();
            };
            row.append(link,star); fragment.append(row);
        }
        if (!guilds.length) fragment.append(this.element('li','ss-empty',this.onlyFavorites ? 'No matching favorites. Star a server in All servers.' : 'No servers match your search.'));
        this.results.replaceChildren(fragment);
        if (focusId) {
            const row = [...this.results.children].find(node => node.dataset.guildId === focusId);
            (row?.querySelector(focusStar ? '.ss-star' : '.ss-link') || this.input).focus();
        }
        this.results.scrollTop = scroll; this.positionHandler?.();
    }
    close(restoreFocus = true) {
        if (!this.panel) return;
        window.removeEventListener('resize',this.positionHandler);
        this.panel.remove(); this.panel = null;
        this.launch?.setAttribute('aria-expanded','false');
        if (restoreFocus && this.previousFocus?.isConnected) this.previousFocus.focus();
        this.input = this.results = this.count = this.filterButtons = this.previousFocus = this.positionHandler = null;
    }
    stop() {
        this.active = false; clearInterval(this.timer); this.close(false);
        if (this.keyHandler) document.removeEventListener('keydown',this.keyHandler);
        if (this.outsideHandler) document.removeEventListener('pointerdown',this.outsideHandler);
        if (this.storeHandler) this.store?.removeChangeListener?.(this.storeHandler);
        this.launch?.remove(); this.launch = null;
        this.storeHandler = this.keyHandler = this.outsideHandler = null;
        BdApi.DOM.removeStyle('ServerSearch');
    }
};
