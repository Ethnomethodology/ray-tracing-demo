/**
 * part3/math.js
 * ──────────────────────────
 * Mathematical utilities for the path tracer.
 * Organized for Taichi.js kernel scope.
 */

export const MathUtils = {
    reflect: (d, n) => {
        return d - 2.0 * d.dot(n) * n;
    },

    refract: (d, n, ni_over_nt) => {
        let rd = d;
        let dt = d.dot(n);
        let discr = 1.0 - ni_over_nt * ni_over_nt * (1.0 - dt * dt);
        if (discr > 0.0) {
            rd = (ni_over_nt * (d - n * dt) - n * ti.sqrt(discr)).normalized();
        } else {
            rd = 0.0;
        }
        return rd;
    },

    mat_mul_point: (m, p) => {
        let hp = [p[0], p[1], p[2], 1.0];
        hp = m.matmul(hp);
        return hp.xyz / hp.w;
    },

    mat_mul_vec: (m, v) => {
        let hv = [v[0], v[1], v[2], 0.0];
        hv = m.matmul(hv);
        return hv.xyz;
    },

    dot_or_zero: (n, l) => {
        return max(0.0, n.dot(l));
    },

    schlick: (cos, eta) => {
        let r0 = (1.0 - eta) / (1.0 + eta);
        r0 = r0 * r0;
        return r0 + (1 - r0) * (1.0 - cos) ** 5;
    },

    mis_power_heuristic: (pf, pg) => {
        let f = pf ** 2;
        let g = pg ** 2;
        return f / (f + g);
    }
};
