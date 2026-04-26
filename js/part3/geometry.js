/**
 * part3/geometry.js
 * ──────────────────────────
 * Intersection routines for primitive shapes.
 */

export const Geometry = {
    intersect_sphere: (pos, d, center, radius, hit_pos) => {
        let T = pos - center;
        let A = 1.0;
        let B = 2.0 * T.dot(d);
        let C = T.dot(T) - radius * radius;
        let delta = B * B - 4.0 * A * C;
        let dist = f32(1e9); // Using inf from scope
        hit_pos = [0.0, 0.0, 0.0];

        if (delta > -1e-4) {
            delta = ti.max(delta, 0);
            let sdelta = ti.sqrt(delta);
            let ratio = 0.5 / A;
            let ret1 = ratio * (-B - sdelta);
            dist = ret1;
            if (dist < 1e9) {
                let old_dist = dist;
                let new_pos = pos + d * dist;
                T = new_pos - center;
                A = 1.0;
                B = 2.0 * T.dot(d);
                C = T.dot(T) - radius * radius;
                delta = B * B - 4 * A * C;
                if (delta > 0) {
                    sdelta = ti.sqrt(delta);
                    ratio = 0.5 / A;
                    ret1 = ratio * (-B - sdelta) + old_dist;
                    if (ret1 > 0) {
                        dist = ret1;
                        hit_pos = new_pos + ratio * (-B - sdelta) * d;
                    }
                } else {
                    dist = 1e9;
                }
            }
        }
        return dist;
    },

    intersect_plane: (pos, d, pt_on_plane, norm) => {
        let dist = f32(1e9);
        let denom = d.dot(norm);
        if (abs(denom) > 1e-4) {
            dist = norm.dot(pt_on_plane - pos) / denom;
        }
        return dist;
    },

    intersect_aabb: (box_min, box_max, o, d) => {
        let intersect = 1;
        let near_t = f32(-1e9);
        let far_t = f32(1e9);
        let near_norm = [0.0, 0.0, 0.0];

        let near_face = 0;
        let near_is_max = 0;

        for (let i of ti.static(range(3))) {
            if (d[i] == 0) {
                if (o[i] < box_min[i] || o[i] > box_max[i]) {
                    intersect = 0;
                }
            } else {
                let i1 = (box_min[i] - o[i]) / d[i];
                let i2 = (box_max[i] - o[i]) / d[i];

                let new_far_t = max(i1, i2);
                let new_near_t = min(i1, i2);
                let new_near_is_max = i2 < i1;

                far_t = min(new_far_t, far_t);
                if (new_near_t > near_t) {
                    near_t = new_near_t;
                    near_face = i32(i);
                    near_is_max = new_near_is_max;
                }
            }
        }
        if (near_t > far_t || far_t < 0) {
            intersect = 0;
        }
        if (intersect) {
            for (let i of ti.static(range(3))) {
                if (near_face == i) {
                    near_norm[i] = -1 + near_is_max * 2;
                }
            }
        }
        let res = [0.0, 0.0, 0.0, 0.0, 0.0];
        res = [f32(intersect), near_t, near_norm.x, near_norm.y, near_norm.z];
        return res;
    }
};
