"""
Compares RockMin ID's TAS fields and CIPW norms with pyrolite (Williams et al. 2020).

    npx vite-node scripts/benchmark-georoc.ts -- --out <dir>    # writes <dir>/rocks-rockminid.csv
    python scripts/compare-pyrolite.py <dir>/rocks-rockminid.csv

Both programs receive the same volatile-free composition and the same
FeO/Fe2O3 split (the one RockMin ID used), so differences come from the
classification polygons and the norm algorithms, not from iron handling.
pyrolite's Le Maitre et al. (2002) TAS variant is used (its default is the
closed-polygon diagram of Middlemost 1994); it splits trachyte and
trachydacite (T1/T2), which are merged to the root field RockMin ID reports.

Author: Kishan Tiwari
"""

import sys
import time
import warnings

import numpy as np
import pandas as pd
from pyrolite.mineral.normative import CIPW_norm
from pyrolite.util.classification import TAS

# pyrolite and pandas emit FutureWarnings about their own APIs; only those
# are silenced, so numerical warnings (overflow, invalid values) still show.
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=DeprecationWarning)

df = pd.read_csv(sys.argv[1])
OX = ["SiO2", "TiO2", "Al2O3", "Cr2O3", "FeO", "Fe2O3", "MnO", "NiO", "MgO", "CaO", "Na2O", "K2O", "P2O5"]

# --- TAS -------------------------------------------------------------------
tas = pd.DataFrame({"SiO2": df.SiO2, "Na2O + K2O": df.Na2O + df.K2O})
py_field = TAS(which_model="LeMaitre").predict(tas).astype(str).replace({"Ba": "B", "Bs": "B", "T1": "T", "T2": "T"})
ours = df.tasCode.fillna("").astype(str)
inside = (ours != "") & (py_field != "none") & (py_field != "nan")
agree = (ours == py_field) & inside
print(f"TAS: {agree.sum()} of {inside.sum()} analyses inside the diagram assigned to the same field "
      f"({100 * agree.sum() / inside.sum():.1f}%); {len(df) - inside.sum()} outside it in one or both programs")
for idx, r in df[inside & ~agree].iterrows():
    print(f"   differs: SiO2 {r.SiO2:.2f}  alk {r.Na2O + r.K2O:.2f}  RockMin ID {r.tasCode}  "
          f"pyrolite {py_field.loc[idx]}")

# --- CIPW ------------------------------------------------------------------
t0 = time.perf_counter()
norm = CIPW_norm(df[OX], Fe_correction=None)
secs = time.perf_counter() - t0
# The 13 common phases first (the published comparison), then the rarer ones
# that only peralkaline, strongly undersaturated or oxidized rocks reach.
PHASES = {"Q": "quartz", "C": "corundum", "Or": "orthoclase", "Ab": "albite", "An": "anorthite",
          "Ne": "nepheline", "Lc": "leucite", "Di": "diopside", "Hy": "hypersthene", "Ol": "olivine",
          "Mt": "magnetite", "Il": "ilmenite", "Ap": "apatite"}
RARE_PHASES = {"Ac": "acmite", "Ns": "sodium metasilicate", "Ks": "potassium metasilicate",
               "Wo": "wollastonite", "Cs": "dicalcium silicate", "Kp": "kaliophilite",
               "Hm": "hematite", "Cm": "chromite", "Ru": "rutile"}
print(f"\nCIPW: pyrolite normed {len(df)} analyses in {secs:.2f} s")
print(f"{'phase':6}{'mean |diff|':>13}{'95th pct':>10}{'max':>8}   (wt%)")

def phase_diff(ours_key, py_key):
    ours = df[f"n_{ours_key}"].fillna(0) if f"n_{ours_key}" in df else pd.Series(0.0, index=df.index)
    theirs = norm[py_key].astype(float).fillna(0) if py_key in norm else pd.Series(0.0, index=df.index)
    return (ours - theirs).abs()


def report(phases, label):
    rows = []
    for ours_key, py_key in phases.items():
        d = phase_diff(ours_key, py_key)
        rows.append(d)
        print(f"{ours_key:6}{d.mean():13.3f}{np.nanpercentile(d, 95):10.3f}{d.max():8.2f}   "
              f"(non-zero in {(d > 0.005).sum()} analyses)")
    total = sum(rows)
    print(f"sum of |diff| over {label}: median {np.nanmedian(total):.2f}, "
          f"95th pct {np.nanpercentile(total, 95):.2f} wt%")
    print()
    return total


report(PHASES, "the 13 common phases")
print("Rarer phases (peralkaline, undersaturated and oxidized compositions):")
report({**PHASES, **RARE_PHASES}, "all 22 phases")


def saturation(q, ol, ne):
    return np.where(ne > 0.005, "undersaturated", np.where(q > 0.005, "oversaturated", np.where(ol > 0.005, "olivine", "saturated")))


ours_sat = saturation(df.n_Q, df.n_Ol, df.n_Ne + df.n_Lc)
py_sat = saturation(norm.quartz.astype(float), norm.olivine.astype(float), norm.nepheline.astype(float) + norm.leucite.astype(float))
print(f"silica-saturation class (Q / Hy-Ol / Ne-normative) agrees for {(ours_sat == py_sat).mean() * 100:.1f}%")
