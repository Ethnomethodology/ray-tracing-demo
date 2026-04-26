/**
 * part3/materials.js
 * ──────────────────────────
 * Material definitions and sampling algorithms.
 */

export const Materials = {
    // Material Identifiers
    NONE: 0,
    LAMBERTIAN: 1,
    SPECULAR: 2,
    GLASS: 3,
    LIGHT: 4,

    sample_brdf: (normal) => {
        let r = 0.0;
        let theta = 0.0;
        let sx = ti.random() * 2.0 - 1.0;
        let sy = ti.random() * 2.0 - 1.0;
        if (sx != 0 || sy != 0) {
            if (abs(sx) > abs(sy)) {
                r = sx;
                theta = (Math.PI / 4) * (sy / sx);
            } else {
                r = sy;
                theta = (Math.PI / 4) * (2 - sx / sy);
            }
        }
        let u = [1.0, 0.0, 0.0];
        if (abs(normal[1]) < 1 - 1e-4) {
            u = normal.cross([0.0, 1.0, 0.0]);
        }
        let v = normal.cross(u);
        let costt = ti.cos(theta);
        let sintt = ti.sin(theta);
        let xy = (u * costt + v * sintt) * r;
        let zlen = ti.sqrt(max(0.0, 1.0 - xy.dot(xy)));
        return xy + zlen * normal;
    },

    compute_brdf_pdf: (normal, sample_dir) => {
        return max(0.0, normal.dot(sample_dir)) / Math.PI;
    }
};
