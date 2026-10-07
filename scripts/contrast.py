#!/usr/bin/env python3
"""WCAG contrast audit of the design tokens in client/src/index.css (axe can't do this in jsdom).
Mirrors the CSS exactly, including color-mix(in oklab, ...) for the accent. Usage: python3 scripts/contrast.py [#accent ...]"""
import sys

def h2rgb(h): h=h.lstrip('#'); return [int(h[i:i+2],16)/255 for i in (0,2,4)]
def lin(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def unlin(c): c=max(0,min(1,c)); return 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
def lum(rgb): r,g,b=map(lin,rgb); return 0.2126*r+0.7152*g+0.0722*b
def ratio(a,b):
    la,lb=sorted((lum(a),lum(b)),reverse=True); return (la+0.05)/(lb+0.05)
def to_oklab(rgb):
    r,g,b=map(lin,rgb)
    l=(0.4122214708*r+0.5363325363*g+0.0514459929*b)**(1/3)
    m=(0.2119034982*r+0.6806995451*g+0.1073969566*b)**(1/3)
    s=(0.0883024619*r+0.2817188376*g+0.6299787005*b)**(1/3)
    return [0.2104542553*l+0.7936177850*m-0.0040720468*s, 1.9779984951*l-2.4285922050*m+0.4505937099*s, 0.0259040371*l+0.7827717662*m-0.8086757660*s]
def from_oklab(L,a,b):
    l=(L+0.3963377774*a+0.2158037573*b)**3; m=(L-0.1055613458*a-0.0638541728*b)**3; s=(L-0.0894841775*a-1.2914855480*b)**3
    return [unlin(4.0767416621*l-3.3077115913*m+0.2309699292*s), unlin(-1.2684380046*l+2.6097574011*m-0.3413193965*s), unlin(-0.0041960863*l-0.7034186147*m+1.7076147010*s)]
def mix(base,other,pct):  # color-mix(in oklab, base pct%, other)
    A,B=to_oklab(h2rgb(base)),to_oklab(h2rgb(other)); k=pct/100
    return from_oklab(*[A[i]*k+B[i]*(1-k) for i in range(3)])

def themes(accent_base):
    return {
      'dark':  dict(bg='#0a0c10',surface='#11141a',raised='#181c24',fg='#e9ebf0',muted='#9aa2b5',subtle='#8089a0',accent=mix(accent_base,'#ffffff',78),accent_fg='#0a0c10',success='#4ade80',danger='#f87171',warning='#fbbf24'),
      'light': dict(bg='#f7f6f3',surface='#ffffff',raised='#f0eee9',fg='#1a1a1f',muted='#5a5e6c',subtle='#666a78',accent=mix(accent_base,'#000000',60),accent_fg='#ffffff',success='#166534',danger='#b91c1c',warning='#a16207'),
    }
PAIRS=[('fg','bg'),('fg','surface'),('muted','bg'),('muted','surface'),('muted','raised'),('subtle','bg'),('subtle','surface'),
       ('accent','bg'),('accent','surface'),('accent_fg','accent'),('success','bg'),('danger','bg'),('warning','bg')]
def c(v): return h2rgb(v) if isinstance(v,str) else v
bad=0
for ab in (sys.argv[1:] or ['#6366f1']):
    print(f"\n=== accent base {ab}")
    for name,t in themes(ab).items():
        print(f" {name}:")
        for f,b in PAIRS:
            r=ratio(c(t[f]),c(t[b])); ok=r>=4.5
            if not ok: bad+=1
            print(f"   {f:10s} on {b:8s} {r:5.2f}  {'ok' if ok else 'FAIL (<4.5)'}")
print(f"\n{bad} failing pair(s)")
