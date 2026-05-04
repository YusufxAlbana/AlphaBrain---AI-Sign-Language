"""
AlphaBrain ASL Base Pose Generator (Compact Version)
------------------------------------------------------
Stores only the 21 base landmarks (42 floats) per letter.
Browser-side augmentation generates full training samples.
Output: public/asl_base_poses.json (~1KB vs 11MB)

Usage:
  python scripts/generate_asl_dataset.py
"""
import json, math
from pathlib import Path

OUTPUT_PATH = Path(__file__).parent.parent / "public" / "asl_base_poses.json"

W  = (0.50, 0.85)
TH_BASE = (0.36, 0.76)
ID_BASE = (0.38, 0.62)
MD_BASE = (0.49, 0.60)
RG_BASE = (0.59, 0.62)
PK_BASE = (0.68, 0.66)
SEG = 0.12

def extended(base, angle=270, length=SEG):
    x, y = base
    a = math.radians(angle)
    pts = [base]
    for frac in [1.0, 0.75, 0.5]:
        x += math.cos(a)*length*frac
        y += math.sin(a)*length*frac
        pts.append((x, y))
    return pts

def curled(base, angle=270, length=SEG):
    x0, y0 = base
    a = math.radians(angle)
    mcp = (x0+math.cos(a)*length*0.5, y0+math.sin(a)*length*0.5)
    pip = (mcp[0]+math.cos(a+1.3)*length*0.4, mcp[1]+math.sin(a+1.3)*length*0.4)
    dip = (pip[0]+math.cos(a+2.0)*length*0.3, pip[1]+math.sin(a+2.0)*length*0.3)
    tip = (dip[0]+math.cos(a+2.5)*length*0.25, dip[1]+math.sin(a+2.5)*length*0.25)
    return [base, mcp, pip, dip, tip][1:]

def half_curl(base, angle=270, length=SEG):
    x0,y0=base; a=math.radians(angle)
    mcp=(x0+math.cos(a)*length*0.5, y0+math.sin(a)*length*0.5)
    pip=(mcp[0]+math.cos(a+0.7)*length*0.4, mcp[1]+math.sin(a+0.7)*length*0.4)
    dip=(pip[0]+math.cos(a+1.2)*length*0.3, pip[1]+math.sin(a+1.2)*length*0.3)
    tip=(dip[0]+math.cos(a+1.6)*length*0.25, dip[1]+math.sin(a+1.6)*length*0.25)
    return [mcp, pip, dip, tip]

def pose(wrist, thumb, index, middle, ring, pinky):
    return [wrist] + thumb + index + middle + ring + pinky

POSES = {
 "A": pose(W,[TH_BASE,(0.30,0.72),(0.27,0.65),(0.26,0.60)],curled(ID_BASE),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "B": pose(W,[TH_BASE,(0.42,0.72),(0.43,0.68),(0.44,0.65)],extended(ID_BASE),extended(MD_BASE),extended(RG_BASE),extended(PK_BASE)),
 "C": pose(W,[TH_BASE,(0.32,0.68),(0.29,0.60),(0.30,0.54)],half_curl(ID_BASE,300),half_curl(MD_BASE,290),half_curl(RG_BASE,285),half_curl(PK_BASE,280)),
 "D": pose(W,[TH_BASE,(0.38,0.70),(0.41,0.66),(0.43,0.63)],extended(ID_BASE),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "E": pose(W,[TH_BASE,(0.40,0.72),(0.42,0.70),(0.43,0.68)],curled(ID_BASE),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "F": pose(W,[TH_BASE,(0.38,0.70),(0.40,0.64),(0.42,0.60)],curled(ID_BASE),extended(MD_BASE),extended(RG_BASE),extended(PK_BASE)),
 "G": pose(W,[TH_BASE,(0.38,0.72),(0.34,0.70),(0.30,0.69)],[(0.38,0.62),(0.32,0.61),(0.27,0.61),(0.22,0.61)],curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "H": pose(W,[TH_BASE,(0.40,0.73),(0.42,0.70),(0.43,0.68)],[(0.38,0.62),(0.32,0.61),(0.27,0.61),(0.22,0.61)],[(0.49,0.60),(0.43,0.60),(0.37,0.60),(0.32,0.60)],curled(RG_BASE),curled(PK_BASE)),
 "I": pose(W,[TH_BASE,(0.41,0.73),(0.43,0.71),(0.44,0.70)],curled(ID_BASE),curled(MD_BASE),curled(RG_BASE),extended(PK_BASE)),
 "J": pose(W,[TH_BASE,(0.41,0.73),(0.43,0.71),(0.44,0.70)],curled(ID_BASE),curled(MD_BASE),curled(RG_BASE),extended(PK_BASE)),
 "K": pose(W,[TH_BASE,(0.40,0.70),(0.42,0.65),(0.43,0.61)],extended(ID_BASE,285),extended(MD_BASE,275),curled(RG_BASE),curled(PK_BASE)),
 "L": pose(W,[TH_BASE,(0.36,0.72),(0.30,0.70),(0.24,0.69)],extended(ID_BASE),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "M": pose(W,[TH_BASE,(0.44,0.74),(0.46,0.73),(0.47,0.72)],curled(ID_BASE),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "N": pose(W,[TH_BASE,(0.43,0.73),(0.45,0.71),(0.46,0.70)],curled(ID_BASE),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "O": pose(W,[TH_BASE,(0.36,0.68),(0.34,0.62),(0.36,0.58)],half_curl(ID_BASE,300),half_curl(MD_BASE,295),half_curl(RG_BASE,290),half_curl(PK_BASE,285)),
 "P": pose(W,[TH_BASE,(0.38,0.72),(0.37,0.67),(0.36,0.63)],[(ID_BASE[0],ID_BASE[1]),(ID_BASE[0]+0.02,ID_BASE[1]+0.07),(ID_BASE[0]+0.03,ID_BASE[1]+0.14),(ID_BASE[0]+0.04,ID_BASE[1]+0.20)],[(MD_BASE[0],MD_BASE[1]),(MD_BASE[0]+0.01,MD_BASE[1]+0.07),(MD_BASE[0]+0.02,MD_BASE[1]+0.13),(MD_BASE[0]+0.03,MD_BASE[1]+0.19)],curled(RG_BASE),curled(PK_BASE)),
 "Q": pose(W,[TH_BASE,(0.38,0.72),(0.38,0.77),(0.38,0.82)],[(ID_BASE[0],ID_BASE[1]),(ID_BASE[0],ID_BASE[1]+0.07),(ID_BASE[0],ID_BASE[1]+0.14),(ID_BASE[0],ID_BASE[1]+0.20)],curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "R": pose(W,[TH_BASE,(0.41,0.73),(0.43,0.71),(0.44,0.70)],extended(ID_BASE,280),[(MD_BASE[0]-0.02,MD_BASE[1])]+extended(MD_BASE,278)[1:],curled(RG_BASE),curled(PK_BASE)),
 "S": pose(W,[TH_BASE,(0.42,0.73),(0.44,0.70),(0.45,0.68)],curled(ID_BASE),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "T": pose(W,[TH_BASE,(0.42,0.71),(0.44,0.68),(0.45,0.66)],curled(ID_BASE),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "U": pose(W,[TH_BASE,(0.41,0.73),(0.43,0.71),(0.44,0.70)],extended(ID_BASE),extended(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "V": pose(W,[TH_BASE,(0.41,0.73),(0.43,0.71),(0.44,0.70)],extended(ID_BASE,280),extended(MD_BASE,260),curled(RG_BASE),curled(PK_BASE)),
 "W": pose(W,[TH_BASE,(0.41,0.73),(0.43,0.71),(0.44,0.70)],extended(ID_BASE,285),extended(MD_BASE,270),extended(RG_BASE,260),curled(PK_BASE)),
 "X": pose(W,[TH_BASE,(0.41,0.73),(0.43,0.71),(0.44,0.70)],half_curl(ID_BASE,285),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
 "Y": pose(W,[TH_BASE,(0.36,0.72),(0.30,0.70),(0.24,0.69)],curled(ID_BASE),curled(MD_BASE),curled(RG_BASE),extended(PK_BASE)),
 "Z": pose(W,[TH_BASE,(0.41,0.73),(0.43,0.71),(0.44,0.70)],extended(ID_BASE),curled(MD_BASE),curled(RG_BASE),curled(PK_BASE)),
}

# Validate all poses are 21 points
for letter, pts in POSES.items():
    assert len(pts) == 21, f"{letter}: expected 21 pts, got {len(pts)}"

# Save as flat [x0,y0,x1,y1,...,x20,y20] per letter
result = {}
for letter, pts in POSES.items():
    result[letter] = [coord for pt in pts for coord in pt]

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
with open(OUTPUT_PATH, "w") as f:
    json.dump(result, f)

size = OUTPUT_PATH.stat().st_size
print(f"[DONE] 26 base poses saved. Size: {size} bytes ({size//1024} KB)")
print(f"Saved: {OUTPUT_PATH}")
