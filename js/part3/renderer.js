/**
 * part3/renderer.js
 * ──────────────────────────
 * Main path tracer implementation using Taichi.js.
 * Orchestrates geometry, materials, and integration.
 */

import { MathUtils } from './math.js';
import { Geometry } from './geometry.js';
import { Materials } from './materials.js';

export class PathTracer {
    constructor(canvasId) {
        this.canvasId = canvasId;
        this.res = [800, 800];
        this.totalSamples = 0;
        this.targetSPP = 16;
        this.isPaused = false;

        // Scene Parameters
        this.params = {
            max_ray_depth: 10,
            eps: 1e-4,
            inf: 1e9,
            fov: 0.8,
            camera_pos: [0.0, 0.6, 3.0],
            refr_idx: 2.4,
            lambertian_brdf: 1.0 / Math.PI,
            stratify_res: 4,
            inv_stratify: 1.0 / 4.0
        };

        // Light Source
        this.light = {
            pos_min: [-0.25, 2.0 - 1e-4, 1.0],
            pos_max: [0.25, 2.0 - 1e-4, 1.12],
            color: [0.9, 0.85, 0.7],
            normal: [0.0, -1.0, 0.0],
            area: 0.5 * 0.12
        };

        // Scene Objects
        this.scene = {
            sp1_center: [0.4, 0.33, 1.75],
            sp1_radius: 0.33,
            sp2_center: [-0.35, 0.33, 0.6],
            sp2_radius: 0.33
        };
    }

    async init() {
        await ti.init();

        this.color_buffer = ti.Vector.field(3, ti.f32, this.res);
        this.tonemapped_buffer = ti.Vector.field(4, ti.f32, this.res);
        this.count_var = ti.field(ti.i32, [1]);

        // Register all modular functions to Taichi scope
        ti.addToKernelScope({
            res: this.res,
            color_buffer: this.color_buffer,
            tonemapped_buffer: this.tonemapped_buffer,
            count_var: this.count_var,

            // Params
            ...this.params,

            // Materials
            mat_none: Materials.NONE,
            mat_lambertian: Materials.LAMBERTIAN,
            mat_specular: Materials.SPECULAR,
            mat_glass: Materials.GLASS,
            mat_light: Materials.LIGHT,

            // Light
            light_min_pos: this.light.pos_min,
            light_max_pos: this.light.pos_max,
            light_color: this.light.color,
            light_normal: this.light.normal,
            light_area: this.light.area,
            light_y_pos: this.light.pos_min[1],

            // Scene
            sp1_center: this.scene.sp1_center,
            sp1_radius: this.scene.sp1_radius,
            sp2_center: this.scene.sp2_center,
            sp2_radius: this.scene.sp2_radius,

            // Modular Functions
            ...MathUtils,
            ...Geometry,
            sample_brdf: Materials.sample_brdf,
            compute_brdf_pdf: Materials.compute_brdf_pdf,

            intersect_light: (pos, d, tmax) => {
                let res = intersect_aabb(light_min_pos, light_max_pos, pos, d);
                let hit = i32(res[0]);
                let t = res[1];
                let result = 0;
                if (hit == 1 && 0 < t && t < tmax) {
                    result = 1;
                }
                return result;
            },

            intersect_scene: (pos, ray_dir, normal, c) => {
                let closest = f32(inf);
                let cur_dist = f32(inf);
                let hit_pos = [0.0, 0.0, 0.0];
                let mat = mat_none;

                // Sphere 1 (Glass)
                cur_dist = intersect_sphere(pos, ray_dir, sp1_center, sp1_radius, hit_pos);
                if (0 < cur_dist && cur_dist < closest) {
                    closest = cur_dist;
                    normal = (hit_pos - sp1_center).normalized();
                    c = [1.0, 1.0, 1.0];
                    mat = mat_glass;
                }

                // Sphere 2 (Mirror)
                cur_dist = intersect_sphere(pos, ray_dir, sp2_center, sp2_radius, hit_pos);
                if (0 < cur_dist && cur_dist < closest) {
                    closest = cur_dist;
                    normal = (hit_pos - sp2_center).normalized();
                    c = [0.95, 0.95, 0.95];
                    mat = mat_specular;
                }

                // Walls (Planes)
                let gray = [0.93, 0.93, 0.93];
                let pnorm = [0.0, 0.0, 0.0];

                // Left
                pnorm = [1.0, 0.0, 0.0];
                cur_dist = intersect_plane(pos, ray_dir, [-1.1, 0.0, 0.0], pnorm);
                if (0 < cur_dist && cur_dist < closest) { closest = cur_dist; normal = pnorm; c = [0.65, 0.05, 0.05]; mat = mat_lambertian; }
 
                // Right
                pnorm = [-1.0, 0.0, 0.0];
                cur_dist = intersect_plane(pos, ray_dir, [1.1, 0.0, 0.0], pnorm);
                if (0 < cur_dist && cur_dist < closest) { closest = cur_dist; normal = pnorm; c = [0.12, 0.45, 0.15]; mat = mat_lambertian; }
 
                // Bottom
                pnorm = [0.0, 1.0, 0.0];
                cur_dist = intersect_plane(pos, ray_dir, [0.0, 0.0, 0.0], pnorm);
                if (0 < cur_dist && cur_dist < closest) { closest = cur_dist; normal = pnorm; c = gray; mat = mat_lambertian; }
 
                // Top
                pnorm = [0.0, -1.0, 0.001];
                cur_dist = intersect_plane(pos, ray_dir, [0.0, 2.0, 0.0], pnorm);
                if (0 < cur_dist && cur_dist < closest) { closest = cur_dist; normal = pnorm; c = gray; mat = mat_lambertian; }
 
                // Far
                pnorm = [0.0, 0.0, 1.0];
                cur_dist = intersect_plane(pos, ray_dir, [0.0, 0.0, 0.0], pnorm);
                if (0 < cur_dist && cur_dist < closest) { closest = cur_dist; normal = pnorm; c = gray; mat = mat_lambertian; }
 
                // Light
                if (intersect_light(pos, ray_dir, closest)) {
                    let res_l = intersect_aabb(light_min_pos, light_max_pos, pos, ray_dir);
                    closest = res_l[1];
                    normal = light_normal;
                    c = gray;
                    mat = mat_light;
                }
                let res = [0.0, 0.0];
                res = [closest, f32(mat)];
                return res;
            },

            visible_to_light: (pos, ray_dir) => {
                let normal = f32([0, 0, 0]);
                let c = f32([0, 0, 0]);
                let res = intersect_scene(pos + eps * ray_dir, ray_dir, normal, c);
                let mat = i32(res[1]);
                return mat == mat_light;
            },

            compute_area_light_pdf: (pos, ray_dir) => {
                let res = intersect_aabb(light_min_pos, light_max_pos, pos, ray_dir);
                let hit_l = i32(res[0]);
                let t = res[1];
                let pdf = 0.0;
                if (hit_l == 1) {
                    let l_cos = light_normal.dot(-ray_dir);
                    if (l_cos > eps) {
                        let tmp = ray_dir * t;
                        pdf = tmp.dot(tmp) / (light_area * l_cos);
                    }
                }
                return pdf;
            },

            sample_area_light: (hit_pos) => {
                let x = ti.random() * (light_max_pos[0] - light_min_pos[0]) + light_min_pos[0];
                let z = ti.random() * (light_max_pos[2] - light_min_pos[2]) + light_min_pos[2];
                return ([x, light_y_pos, z] - hit_pos).normalized();
            },

            sample_direct_light: (hit_pos, hit_normal, hit_color) => {
                let direct_li = [0.0, 0.0, 0.0];
                let fl = lambertian_brdf * hit_color * light_color;

                // 1. Sample area light
                let to_light_dir = sample_area_light(hit_pos);
                if (to_light_dir.dot(hit_normal) > 0) {
                    let light_pdf = compute_area_light_pdf(hit_pos, to_light_dir);
                    let brdf_pdf = compute_brdf_pdf(hit_normal, to_light_dir);
                    if (light_pdf > 0 && brdf_pdf > 0 && visible_to_light(hit_pos, to_light_dir)) {
                        let w = mis_power_heuristic(light_pdf, brdf_pdf);
                        direct_li += (fl * w * dot_or_zero(to_light_dir, hit_normal)) / light_pdf;
                    }
                }

                // 2. Sample BRDF
                let brdf_dir = sample_brdf(hit_normal);
                let brdf_pdf = compute_brdf_pdf(hit_normal, brdf_dir);
                if (brdf_pdf > 0) {
                    let light_pdf = compute_area_light_pdf(hit_pos, brdf_dir);
                    if (light_pdf > 0 && visible_to_light(hit_pos, brdf_dir)) {
                        let w = mis_power_heuristic(brdf_pdf, light_pdf);
                        direct_li += (fl * w * dot_or_zero(brdf_dir, hit_normal)) / brdf_pdf;
                    }
                }
                return direct_li;
            },

            sample_ray_dir: (indir, normal, mat) => {
                let u = [0.0, 0.0, 0.0];
                let pdf = 1.0;
                if (mat == mat_lambertian) {
                    u = sample_brdf(normal);
                    pdf = max(eps, compute_brdf_pdf(normal, u));
                } else if (mat == mat_specular) {
                    u = reflect(indir, normal);
                } else if (mat == mat_glass) {
                    let cos = indir.dot(normal);
                    let ni_over_nt = refr_idx;
                    let outn = normal;
                    if (cos > 0.0) { 
                        outn = -normal; 
                        ni_over_nt = refr_idx; 
                        cos = -indir.dot(normal);
                    } else { 
                        ni_over_nt = 1.0 / refr_idx; 
                        cos = -cos; 
                    }

                    let refr_dir = refract(indir, outn, ni_over_nt);
                    let refl_prob = 1.0;
                    if (refr_dir.normSqr() > 0.0) {
                        refl_prob = schlick(cos, refr_idx);
                    }
                    if (ti.random() < refl_prob) {
                        u = reflect(indir, normal);
                    } else {
                        u = refr_dir;
                    }
                }
                let res = [0.0, 0.0, 0.0, 0.0];
                let un = u.normalized();
                res = [un.x, un.y, un.z, pdf];
                return res;
            }
        });

        this.setupKernels();

        const htmlCanvas = document.getElementById(this.canvasId);
        htmlCanvas.width = 500;
        htmlCanvas.height = 500;
        this.canvas = new ti.Canvas(htmlCanvas);

        this.setupUI();
    }

    setupUI() {
        const tabs = document.querySelectorAll('.btn-toggle');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active state
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Set SPP and Reset
                this.targetSPP = parseInt(tab.dataset.spp);
                this.reset().catch(console.error);
            });
        });
    }

    async reset() {
        const wasPaused = this.isPaused;
        this.isPaused = true;
        
        this.clearKernel();
        this.totalSamples = 0;
        await ti.sync();
        
        this.canvas.setImage(this.tonemapped_buffer);
        this.isPaused = wasPaused;
    }

    setupKernels() {
        this.clearKernel = ti.kernel(() => {
            for (let I of ti.ndrange(res[0], res[1])) {
                color_buffer[I] = [0.0, 0.0, 0.0];
                tonemapped_buffer[I] = [0.0, 0.0, 0.0, 0.0];
            }
            count_var[0] = 0;
        });


        this.renderKernel = ti.kernel(() => {
            for (let UV of ti.ndrange(res[0], res[1])) {
                let u = UV[0];
                let v = UV[1];
                let aspect_ratio = res[0] / res[1];
                let pos = camera_pos;
                let cur_iter = count_var[0];
                let str_x = i32(cur_iter / stratify_res);
                let str_y = cur_iter % stratify_res;

                let ray_dir = [
                    (2 * fov * (u + (str_x + ti.random()) * inv_stratify)) / res[1] - fov * aspect_ratio - 1e-5,
                    (2 * fov * (v + (str_y + ti.random()) * inv_stratify)) / res[1] - fov - 1e-5,
                    -1.0,
                ].normalized();

                let acc_color = [0.0, 0.0, 0.0];
                let throughput = [1.0, 1.0, 1.0];

                let depth = 0;
                let last_pdf = 1.0;
                let was_specular = 1; // Camera is "specular" for first hit

                while (depth < max_ray_depth) {
                    let hit_normal = f32([0, 0, 0]);
                    let hit_color = f32([0, 0, 0]);
                    let res = intersect_scene(pos, ray_dir, hit_normal, hit_color);
                    let closest = res[0];
                    let mat = i32(res[1]);
                    if (mat == mat_none) break;

                    let hit_pos = pos + closest * ray_dir;
                    if (mat == mat_light) {
                        if (was_specular == 1) {
                            acc_color += throughput * light_color;
                        } else {
                            // MIS for indirect hit on light
                            let light_pdf = compute_area_light_pdf(pos, ray_dir);
                            let w = mis_power_heuristic(last_pdf, light_pdf);
                            acc_color += throughput * light_color * w;
                        }
                        break;
                    } else if (mat == mat_lambertian) {
                        acc_color += throughput * sample_direct_light(hit_pos, hit_normal, hit_color);
                    }

                    depth += 1;
                    let sample_res = sample_ray_dir(ray_dir, hit_normal, mat);
                    ray_dir = [sample_res[0], sample_res[1], sample_res[2]];
                    last_pdf = sample_res[3];
                    pos = hit_pos + 1e-4 * ray_dir;

                    if (mat == mat_lambertian) {
                        throughput = (throughput * lambertian_brdf * hit_color * dot_or_zero(hit_normal, ray_dir)) / last_pdf;
                        was_specular = 0;
                    } else {
                        throughput *= hit_color;
                        was_specular = 1;
                    }
                }
                color_buffer[[u, v]] += acc_color;
            }
            count_var[0] = (count_var[0] + 1) % (stratify_res * stratify_res);
        });

        this.tonemapKernel = ti.kernel((accumulated) => {
            for (let I of ti.ndrange(res[0], res[1])) {
                let color = ti.sqrt((color_buffer[I] / accumulated) * 100.0);
                tonemapped_buffer[I] = [color.x, color.y, color.z, 1.0];
            }
        });
    }

    async run() {
        const interval = 10;
        let last_t = new Date().getTime();

        const frame = async () => {
            if (!this.isPaused && this.totalSamples < this.targetSPP) {
                const burst = Math.min(interval, this.targetSPP - this.totalSamples);
                for (let i = 0; i < burst; ++i) {
                    this.renderKernel();
                    this.totalSamples += 1;
                }
                
                if (this.totalSamples > 0) {
                    this.tonemapKernel(this.totalSamples);
                    await ti.sync();
                    this.canvas.setImage(this.tonemapped_buffer);
                }
            }
            
            requestAnimationFrame(frame);
        };
        await frame();
    }
}
