# Project Overview
**img_loading_lazy** (v2.2.1) is a high-performance automated tool (CLI script) designed to improve web image loading performance and prevent Cumulative Layout Shift (CLS). It works by analyzing actual image files referenced in HTML, automatically adding explicit `width` attributes, and injecting optimization attributes like `loading="lazy"`, `decoding="async"`, and inline styles including `aspect-ratio` and `flex-shrink`. 

The tool supports two parsing engines: a safe Regular Expression engine and an advanced HTML parsing engine using `cheerio`. It also computes responsive widths using `rem` or `vw` units. Successfully processed `<img>` tags are marked with a `data-resized="true"` attribute.

**Main Technologies:**
- **Language/Environment:** Node.js
- **Key Libraries:** `cheerio` (for HTML parsing)
- **Packaging:** `pkg` (to compile the script into a standalone Windows executable `.exe`)

# Architecture & Directory Structure
- `src/`: Contains the main source code (`convert_loading_lazy.js`) and dependency definitions (`package.json`).
- `input/`: The directory where users should place the target HTML files to be processed.
- `images/`: The directory where users must place the actual image binaries referenced in the HTML files. The script analyzes these to determine the correct dimensions.
- `output/`: The directory where the optimized HTML files are outputted after processing.

# Building and Running

### Development & Node.js Execution
1. **Install Dependencies:**
   ```bash
   cd src
   npm install
   ```
2. **Run the Script:**
   You can run the script manually by providing the required parameters from the root directory:
   ```bash
   # Usage: node src/convert_loading_lazy.js [Unit] [BaseWidth] [UseLazy] [Engine]
   node src/convert_loading_lazy.js rem 10 true cheerio
   ```
   *Parameters:*
   - `Unit`: Output width unit (`rem`, `vw`, or `none`).
   - `BaseWidth`: Base width for `vw` calculation or scale for `rem`.
   - `UseLazy`: Apply `loading="lazy"` and `decoding="async"` (`true` or `false`).
   - `Engine`: Parsing method (`regex` or `cheerio`).

### Building the Executable
To build a standalone Windows executable (`loadinglazy.exe`) using `pkg`:
```bash
cd src
npm run build:exe
```
This will output `loadinglazy.exe` to the parent (root) directory.

### Running the Executable
Run `loadinglazy.exe` (if built). It provides an interactive CLI prompt to configure the options easily. If `input` or `images` directories are missing, the tool automatically generates them and waits.

# Development Conventions & Notes
- **PHP and Comment Preservation:** When processing files, the tool has specific safeguards (especially in `regex` mode) to protect PHP blocks (`<?php ... ?>`) and HTML comments from being broken during the image tag transformation. For complex PHP templates, the `regex` engine is recommended over `cheerio`.
- **Supported Image Formats:** The tool supports analyzing the dimensions of PNG, JPG/JPEG, and WebP images.
- **Workflow:** Always ensure the required images are present in the `images/` folder before running the tool, otherwise it cannot calculate the dimensions for the respective `<img>` tags in the HTML.
