// Observes committed titles after each simulation frame; does not mutate gameplay or RNG.
export class ApexMetrics {
  constructor() {
    this.seconds = 0;
    this.populationSeconds = 0;
    this.countSeconds = {};
    this.active = new Map();
    this.tenures = [];
    this.solo = null;
    this.soloRuns = [];
    this.gains = 0;
    this.losses = 0;
    this.holders = new Set();
  }
  observe(units, dt) {
    if (!Number.isFinite(dt) || dt <= 0) throw new Error('dt must be positive and finite');
    const ids = new Set(units.filter(e => e.alive && e.behavior !== 'orb' && e.apex).map(e => e.id));
    for (const [id, seconds] of this.active) if (!ids.has(id)) {
      this.tenures.push({id, seconds, ongoing: false});
      this.active.delete(id); this.losses++;
    }
    for (const id of ids) {
      if (!this.active.has(id)) { this.gains++; this.holders.add(id); }
      this.active.set(id, (this.active.get(id) ?? 0) + dt);
    }
    const soloId = ids.size === 1 ? [...ids][0] : null;
    if (this.solo && this.solo.id !== soloId) {
      this.soloRuns.push({...this.solo, ongoing: false}); this.solo = null;
    }
    if (soloId !== null) {
      this.solo ??= {id: soloId, seconds: 0};
      this.solo.seconds += dt;
    }
    this.seconds += dt;
    this.populationSeconds += ids.size * dt;
    this.countSeconds[ids.size] = (this.countSeconds[ids.size] ?? 0) + dt;
  }
  summary() {
    const round = n => Number(n.toFixed(3));
    const tenures = [...this.tenures, ...[...this.active].map(([id, seconds]) => ({id, seconds, ongoing: true}))];
    const soloRuns = [...this.soloRuns, ...(this.solo ? [{...this.solo, ongoing: true}] : [])];
    return {
      observedSeconds: round(this.seconds),
      apexEntitySeconds: round(this.populationSeconds),
      secondsByApexCount: Object.fromEntries(Object.entries(this.countSeconds).map(([k,v]) => [k,round(v)])),
      distinctHolders: this.holders.size, titleGains: this.gains, titleLosses: this.losses,
      // A gain/loss need not be a direct succession: up to five titles can coexist.
      tenures: tenures.map(r => ({...r, seconds: round(r.seconds)})),
      // Monopoly here means exactly one title holder, not necessarily score rank 1.
      soleHolderRuns: soloRuns.map(r => ({...r, seconds: round(r.seconds)})),
    };
  }
}
