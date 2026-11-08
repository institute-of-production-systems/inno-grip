#!/usr/bin/env python3
"""Batch PNG renders using CloudCompare's renderer through CloudComPy.

Windows setup (2026 CloudComPy312 distribution):
  1. Download/extract the Windows CloudComPy binary from:
     https://www.simulation.openfields.fr/index.php/cloudcompy-downloads
  2. Follow its doc/UseWindowsCondaBinary.md to prepare Python 3.12.
     A Python venv is supported; Conda is optional for the 2026 binaries.
  3. In cmd.exe, activate that environment, then run:
       call "C:\\Tools\\CloudComPy312\\envCloudComPy.bat"
  4. Run this script with that environment's python, not CloudCompare.exe.

Example in cmd.exe (the ^ character continues a command onto the next line):
  python render_pointclouds.py "C:\\project\\imgs\\3dr_display" ^
    "C:\\project\\imgs\\3dr_png" ^
    --eye 0 -0.10 0.10 --look-at 0 0 0 --up 0 0 1 --point-size 1

eye and look-at use the point cloud's coordinate units, not necessarily metres.
The example camera is 0.1414 units from the look-at position. The view uses
perspective projection and the CloudComPy viewer's field of view. It never
calls zoom-to-fit, so a large or misaligned cloud may extend outside the image.

By default the camera is fixed in world coordinates. --center-each instead
places look-at at each cloud's bounding-box centre and preserves the supplied
eye-minus-look-at offset (same angle and distance, without rescaling).
To compare registered reconstructions at precisely the same world viewpoint,
omit --center-each.

--inspect prints bounding boxes to help choose camera coordinates.
--limit 1 renders only the first file, for a quick framing check.
--dry-run lists input/output paths without requiring CloudComPy.
--skip-existing leaves existing PNGs alone; otherwise they are replaced.
Original PLY files are never modified. Run on a Windows desktop with OpenGL;
CloudComPy may briefly display its rendering window during the batch.

API references:
  https://www.simulation.openfields.fr/documentation/CloudComPy/html/cloudComPy.html
  https://www.simulation.openfields.fr/documentation/CloudComPy/html/ccPointCloud.html
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
import struct
import sys
import tempfile


CATEGORIES = ("single", "multiple", "stacked")


def unit(vector):
    length = math.hypot(*vector)
    if not math.isfinite(length) or length == 0:
        raise ValueError("Camera vectors must be finite and nonzero.")
    return tuple(v / length for v in vector)


def camera_basis(eye, target, up):
    """Return a unit look direction and orthogonal unit image-up direction."""
    if not all(math.isfinite(v) for vector in (eye, target, up) for v in vector):
        raise ValueError("Camera coordinates must be finite.")
    forward = unit(tuple(t - e for e, t in zip(eye, target)))
    up = unit(up)
    projection = sum(u * f for u, f in zip(up, forward))
    image_up = tuple(u - projection * f for u, f in zip(up, forward))
    if math.hypot(*image_up) < 1e-8:
        raise ValueError("--up must not be parallel to the viewing direction.")
    return forward, unit(image_up)


def discover(source, target):
    jobs = []
    seen = set()
    for category in CATEGORIES:
        folder = source / category
        if not folder.is_dir():
            continue
        for file in sorted(folder.iterdir(), key=lambda p: p.name.casefold()):
            if file.is_file() and file.suffix.lower() == ".ply":
                output = target / category / (file.stem + ".png")
                # Windows destinations are generally case-insensitive.
                key = str(output).casefold()
                if key in seen:
                    raise ValueError(f"Multiple clouds map to {output}")
                seen.add(key)
                jobs.append((file, output))
    return jobs


def png_size(file):
    with file.open("rb") as stream:
        header = stream.read(24)
    if (len(header) != 24 or header[:8] != b"\x89PNG\r\n\x1a\n"
            or header[12:16] != b"IHDR"):
        raise RuntimeError(f"Renderer did not write a valid PNG: {file}")
    return struct.unpack(">II", header[16:24])


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("source", type=Path, help="3dr_display directory")
    parser.add_argument("target", type=Path, help="Output directory for PNG folders")
    parser.add_argument("--eye", type=float, nargs=3, metavar=("X", "Y", "Z"),
                        help="Camera position, in cloud coordinate units")
    parser.add_argument("--look-at", type=float, nargs=3, default=(0., 0., 0.),
                        metavar=("X", "Y", "Z"), help="Target position; default: origin")
    parser.add_argument("--up", type=float, nargs=3, default=(0., 0., 1.),
                        metavar=("X", "Y", "Z"), help="Image-up direction; default: +Z")
    parser.add_argument("--point-size", type=int, default=1, help="Fixed point size, default: 1")
    parser.add_argument("--width", type=int, default=1600, help="Requested image width")
    parser.add_argument("--height", type=int, default=1200, help="Requested image height")
    parser.add_argument("--background", type=int, nargs=3, default=(255, 255, 255),
                        metavar=("R", "G", "B"), help="Background RGB, default: white")
    parser.add_argument("--center-each", action="store_true", help="Keep the camera offset relative to each bounding-box centre")
    parser.add_argument("--limit", type=int, help="Process only the first N matching files")
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--inspect", action="store_true", help="Print cloud bounding boxes without rendering")
    args = parser.parse_args(argv)
    if not args.source.is_dir():
        parser.error(f"Source directory does not exist: {args.source}")
    if args.point_size < 1 or args.point_size > 255:
        parser.error("--point-size must be in 1..255; 0 would inherit a viewer default")
    if args.width < 64 or args.height < 64:
        parser.error("--width and --height must be at least 64")
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    if any(c < 0 or c > 255 for c in args.background):
        parser.error("--background components must be in 0..255")
    if not (args.dry_run or args.inspect):
        if args.eye is None:
            parser.error("--eye X Y Z is required for rendering")
        try:
            camera_basis(args.eye, args.look_at, args.up)
        except ValueError as exc:
            parser.error(str(exc))
    args.source = args.source.resolve()
    args.target = args.target.resolve()
    return args


def run(args, cc=None):
    jobs = discover(args.source, args.target)
    if args.skip_existing and not args.inspect:
        jobs = [(src, dst) for src, dst in jobs if not dst.exists()]
    if args.limit is not None:
        jobs = jobs[:args.limit]
    if not jobs:
        print("No matching PLY files to process.", flush=True)
        return 0
    if args.dry_run:
        for src, dst in jobs:
            print(f"{src} -> {dst}")
        print(f"Dry run: {len(jobs)} file(s).")
        return 0

    if cc is None:
        try:
            import cloudComPy as cc
        except ImportError as exc:
            raise RuntimeError("Cannot import CloudComPy. Activate its Python environment and "
                               "run envCloudComPy.bat in cmd.exe before running this script. "
                               f"Import error: {exc}") from exc
    # Import initializes CloudCompare in current releases; initCC is also
    # documented for older distributions and may safely be called explicitly.
    cc.initCC()
    if not args.inspect:
        forward, image_up = camera_basis(args.eye, args.look_at, args.up)
        offset = tuple(e - t for e, t in zip(args.eye, args.look_at))
        print(f"Rendering {len(jobs)} cloud(s); camera distance={math.hypot(*offset):g} "
              f"cloud units; point size={args.point_size}.", flush=True)

    first_size = None
    for index, (src, dst) in enumerate(jobs, 1):
        print(f"[{index}/{len(jobs)}] {src}", flush=True)
        cloud = None
        attached = False
        try:
            # Disable automatic per-file global shifts so world camera
            # coordinates keep the same interpretation throughout the batch.
            cloud = cc.loadPointCloud(str(src), cc.CC_SHIFT_MODE.NO_GLOBAL_SHIFT)
            if cloud is None or cloud.size() == 0:
                raise RuntimeError(f"Could not load a nonempty point cloud: {src}")
            bounds = cloud.getOwnBB()
            low = tuple(bounds.minCorner())
            high = tuple(bounds.maxCorner())
            if not all(math.isfinite(v) for v in low + high):
                raise RuntimeError(f"Invalid bounding box: {src}")
            if args.inspect:
                print(f"  min={low}; max={high}; "
                      f"centre={tuple((a+b)/2 for a,b in zip(low, high))}", flush=True)
                continue

            eye = tuple(args.eye)
            if args.center_each:
                centre = tuple((a + b) / 2 for a, b in zip(low, high))
                eye = tuple(c + o for c, o in zip(centre, offset))

            cloud.setPointSize(args.point_size)
            cloud.showNormals(False)
            if not cloud.hasColors():
                # Colourless clouds get neutral grey; existing RGB is preserved.
                if not cloud.colorize(0.25, 0.25, 0.25):
                    raise RuntimeError("Could not allocate fallback point colours")
            cloud.showColors(True)
            cloud.showSF(False)
            cloud.showSFColorsScale(False)
            #cloud.setSelected(False)
            cc.addToRenderScene(cloud, False)
            attached = True
            cc.setBackgroundColor(False, *args.background)
            cc.setTextDefaultCol(0, 0, 0)
            cc.setViewerPerspectiveView()
            cc.setCustomView(forward, image_up)
            # Set this LAST: changing view/perspective can reposition the camera.
            cc.setCameraPos(eye)
            # Intentionally no setGlobalZoom() / zoomOnSelectedEntity().
            dst.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.TemporaryDirectory(prefix=".cc-render-", dir=dst.parent) as temp:
                image = Path(temp) / "render.png"
                cc.render(str(image), args.width, args.height, False)
                actual_size = png_size(image)
                if first_size is not None and actual_size != first_size:
                    raise RuntimeError(f"Image resolution changed: {first_size} -> {actual_size}")
                if first_size is None:
                    first_size = actual_size
                    if actual_size != (args.width, args.height):
                        print(f"Warning: this viewer/DPI configuration produced {actual_size} "
                              f"instead of {(args.width, args.height)} pixels.", file=sys.stderr)
                image.replace(dst)
            print(f"  Saved {dst} ({actual_size[0]} x {actual_size[1]})", flush=True)
        finally:
            if cloud is not None:
                if attached:
                    # This function DELETES the C++ entity; do not delete twice.
                    cc.removeFromRenderScene(cloud)
                else:
                    cc.deleteEntity(cloud)
                cloud = None
    print(f"{'Inspected' if args.inspect else 'Rendered'} {len(jobs)} file(s).", flush=True)
    return 0


def main(argv=None):
    args = parse_args(argv)
    try:
        return run(args)
    except (OSError, RuntimeError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
