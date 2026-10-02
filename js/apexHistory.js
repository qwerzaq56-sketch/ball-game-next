// Runtime observer. Reads committed titles, never changes entities or consumes randomness.
// Bounded recent lists keep long sessions cheap; totals survive truncation.
export class ApexHistory {
  constructor() {
    this.active = new Map();
    this.recent = [];
    this.completed = [];
    this.secondsByCount = {absent:0, solo:0, coexist:0};
    this.gains = 0; this.losses = 0;
    this.longestTenure = 0; this.longestSolo = 0;
    this.solo = null;
  }
  record(event) {
    this.recent.unshift(event);
    if (this.recent.length > 24) this.recent.pop();
  }
  observe(units, dt, time) {
    const holders = units.filter(e => e.alive && e.behavior !== 'orb' && e.apex);
    const ids = new Set(holders.map(e => e.id));
    for (const [id, record] of this.active) if (!ids.has(id)) {
      const ended = {...record, endedAt:time, seconds:Math.max(0,time-record.since)};
      this.longestTenure = Math.max(this.longestTenure, ended.seconds);
      this.completed.unshift(ended); if (this.completed.length > 12) this.completed.pop();
      this.record({...ended, type:'loss', time}); this.losses++; this.active.delete(id);
    }
    for (const e of holders) if (!this.active.has(e.id)) {
      const record = {id:e.id, name:e.displayName ?? `#${e.id}`, color:e.colorHex, since:time};
      this.active.set(e.id, record); this.gains++; this.record({...record, type:'gain', time});
    }
    const soloId = holders.length === 1 ? holders[0].id : null;
    if (this.solo && this.solo.id !== soloId) {
      this.longestSolo = Math.max(this.longestSolo, time-this.solo.since);
      this.solo = null;
    }
    if (soloId !== null && !this.solo) this.solo = {id:soloId, since:time};
    this.secondsByCount[holders.length === 0 ? 'absent' : holders.length === 1 ? 'solo' : 'coexist'] += dt;
  }
  summary(time) {
    const current = [...this.active.values()].map(e => ({...e, seconds:Math.max(0,time-e.since)}));
    return {current, recent:this.recent, completed:this.completed, gains:this.gains, losses:this.losses,
      secondsByCount:{...this.secondsByCount},
      longestTenure:Math.max(this.longestTenure, ...current.map(e=>e.seconds)),
      longestSolo:Math.max(this.longestSolo, this.solo ? time-this.solo.since : 0)};
  }
}
