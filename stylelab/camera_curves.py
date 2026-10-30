"""Camera move curves from motion_<id>.json: every fast move (whip, snap, dive) with its speed profile, ease in/out
lengths, overshoot and settle; slow-move speeds; holds; roll and zoom habits. Writes camera_curves.json + a plot sheet.
usage: python camera_curves.py"""
import json, pathlib
import numpy as np
import cv2

import lab
HERE = lab.sub("deep3")
IDS = lab.IDS


def series(M):
    pf = M["per_frame"]; n = len(pf)
    g = lambda k: np.array([np.nan if (p is None or p["pts"] < 25) else p[k] for p in pf])
    dx, dy, z, ro, res = g("dx"), g("dy"), g("z"), g("roll"), g("res")
    sp = np.hypot(dx, dy) + 0.5 * np.abs(z)
    diff = np.array(M["diff"])
    # frames the tracker loses (blur in a whip, or a cut): fill speed from the frame difference so whips stay continuous
    lost = np.isnan(sp)
    return dx, dy, z, ro, res, sp, diff, lost


out = {}; plots = []
for vid in IDS:
    M = json.loads((HERE / f"motion_{vid}.json").read_text(encoding="utf-8"))
    dx, dy, z, ro, res, sp, diff, lost = series(M); n = len(sp)
    spf = np.where(lost, np.nan, sp)
    # fast moves: diff-based activity (works through blur) above 18 or tracked speed above 2 %/frame
    act = (diff > 18) | (np.nan_to_num(spf) > 2.0)
    moves = []; i = 0
    while i < n:
        if act[i]:
            j = i
            while j < n and (act[j] or (j + 1 < n and act[j + 1])): j += 1
            if j - i >= 3:
                # extend to where the tracked speed falls under 0.3 %/frame on each side
                a = i
                while a > 0 and not np.isnan(spf[a - 1]) and spf[a - 1] > 0.3 and i - a < 30: a -= 1
                b = j
                while b < n and not np.isnan(spf[b]) and spf[b] > 0.3 and b - j < 40: b += 1
                prof = np.nan_to_num(np.where(np.isnan(spf[a:b]), diff[a:b] / 6, spf[a:b]))
                pk = int(np.argmax(diff[a:b])) if np.isnan(spf[a:b]).any() else int(np.argmax(prof))
                # direction before and after: overshoot = the tracked pan reverses within 10 frames after b
                seg_dx = np.nansum(dx[a:b]); seg_dy = np.nansum(dy[a:b]); seg_z = np.nansum(z[a:b])
                main = np.array([seg_dx, seg_dy]); main = main / (np.linalg.norm(main) + 1e-9)
                after = np.array([np.nan_to_num(dx[b:b + 10]), np.nan_to_num(dy[b:b + 10])]).T @ main if b < n else np.zeros(1)
                cut_inside = bool(any(a <= c <= b for c in M["cuts_frames"]))
                moves.append({"t": round(a / 30, 2), "frames": b - a, "fast_frames": j - i, "peak_frame": pk, "peak_at": round(pk / max(1, b - a - 1), 2),
                              "ease_in_frames": pk, "ease_out_frames": b - a - 1 - pk, "lost_frames": int(np.isnan(spf[a:b]).sum()),
                              "pan_pct": [round(float(seg_dx), 1), round(float(seg_dy), 1)], "zoom_pct": round(float(seg_z), 1),
                              "roll_deg": round(float(np.nansum(ro[a:b])), 2), "reverse_after_pct": round(float(-after[after < 0].sum()), 2),
                              "max_diff": round(float(diff[a:b].max()), 1), "profile": [round(float(v), 2) for v in prof]})
            i = j + 1
        else: i += 1
    # slow moves and holds outside fast moves
    mask = np.ones(n, bool)
    for m in moves: s = int(m["t"] * 30); mask[s:s + m["frames"]] = False
    calm = mask & ~np.isnan(spf)
    v = spf[calm]
    # how long the camera keeps one slow direction: sign runs of the dominant axis
    sdx = np.sign(np.nan_to_num(dx)); runs = []; r = 1
    for k in range(1, n):
        if calm[k] and calm[k - 1] and sdx[k] == sdx[k - 1] and sdx[k] != 0: r += 1
        else:
            if r > 3: runs.append(r)
            r = 1
    zc = z[calm]; rc = ro[calm]
    out[vid] = {"fast_moves": len(moves), "fast_moves_per_10s": round(len(moves) / (n / 300), 2),
                "calm_speed_pct_per_frame": {"p10": round(float(np.percentile(v, 10)), 3), "p50": round(float(np.percentile(v, 50)), 3), "p90": round(float(np.percentile(v, 90)), 3)},
                "share_calm_frames_below_0.05": round(float((v < 0.05).mean()), 2), "share_calm_frames_below_0.15": round(float((v < 0.15).mean()), 2),
                "zoom_calm_pct_per_frame": {"p50_abs": round(float(np.nanmedian(np.abs(zc))), 3), "share_zoom_in": round(float((zc > 0.02).mean()), 2), "share_zoom_out": round(float((zc < -0.02).mean()), 2)},
                "roll_calm_deg_per_frame_p50_abs": round(float(np.nanmedian(np.abs(rc))), 3),
                "pan_direction_run_frames_median": int(np.median(runs)) if runs else None,
                "residual_motion_calm_p50": round(float(np.nanmedian(res[calm])), 2),
                "moves": moves}
    print(vid, "fast", len(moves), out[vid]["calm_speed_pct_per_frame"], "zoom", out[vid]["zoom_calm_pct_per_frame"], "run", out[vid]["pan_direction_run_frames_median"], flush=True)
    # plot: speed (white), diff/6 (grey), moves shaded
    Wd = n * 2; img = np.full((200, Wd, 3), 18, np.uint8)
    for m in moves:
        s = int(m["t"] * 30) * 2; cv2.rectangle(img, (s, 0), (s + m["frames"] * 2, 199), (60, 40, 40), -1)
    for k in range(1, n):
        y0 = 199 - int(min(199, np.nan_to_num(diff[k - 1]) * 3)); y1 = 199 - int(min(199, np.nan_to_num(diff[k]) * 3))
        cv2.line(img, ((k - 1) * 2, y0), (k * 2, y1), (110, 110, 110), 1)
        if not np.isnan(spf[k]) and not np.isnan(spf[k - 1]):
            cv2.line(img, ((k - 1) * 2, 199 - int(min(199, spf[k - 1] * 40))), (k * 2, 199 - int(min(199, spf[k] * 40))), (255, 255, 255), 1)
    for s in range(0, n // 30 + 1): cv2.putText(img, str(s), (s * 60 + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (120, 255, 120), 1)
    plots.append(img)
(HERE / "camera_curves.json").write_text(json.dumps(out, indent=1), encoding="utf-8")
Wm = max(p.shape[1] for p in plots)
sheet = np.vstack([np.pad(p, ((0, 6), (0, Wm - p.shape[1]), (0, 0))) for p in plots])
for k in range(0, sheet.shape[1], 1200):
    cv2.imwrite(str(HERE / f"camera_plot_{k // 1200}.png"), sheet[:, k:k + 1200])
