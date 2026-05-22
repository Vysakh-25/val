const WEAPONS = {
  vandal: {
    name: 'Vandal', slot: 1, ammo: 25, reserve: 75, reloadTime: 2500,
    damageHead: 150, damageBody: 40, damageLeg: 33, fireRate: 11,
    isAutomatic: true, sprayControl: 0.12, zoomFov: 45, type: 'vandal'
  },
  shorty: {
    name: 'Shorty', slot: 2, ammo: 2, reserve: 10, reloadTime: 1800,
    damageHead: 36, damageBody: 12, damageLeg: 9, fireRate: 3,
    isAutomatic: false, sprayControl: 0.65, zoomFov: 65, type: 'shorty', pellets: 8
  },
  operator: {
    name: 'Operator', slot: 3, ammo: 5, reserve: 15, reloadTime: 3500,
    damageHead: 255, damageBody: 150, damageLeg: 120, fireRate: 0.75,
    isAutomatic: false, sprayControl: 0.02, zoomFov: 15, type: 'operator'
  },
  knife: {
    name: 'Knife', slot: 4, ammo: 0, reserve: 0, reloadTime: 0,
    damageHead: 75, damageBody: 50, damageLeg: 50, fireRate: 1.5,
    isAutomatic: false, sprayControl: 0.0, zoomFov: 75, type: 'knife'
  }
};

window.WEAPONS = WEAPONS;