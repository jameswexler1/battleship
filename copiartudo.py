import os

# Scan current directory
root_dir = "."
output_file = "merged_output.txt"
skip_dirs = {
    os.path.join(root_dir, "public"),
    os.path.join(root_dir, "static", "js"),
}  # directories to ignore

skip_extensions = {".ico", ".png"}  # file types to ignore

with open(output_file, "wb") as out_f:  # open in binary mode for all file types
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip hidden directories
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]

        # Skip specific directories (public/ and static/js)
        dirnames[:] = [d for d in dirnames if os.path.join(dirpath, d) not in skip_dirs]

        for filename in filenames:
            # Skip hidden files, the output file itself, and unwanted file types
            if (
                filename.startswith(".")
                or filename == output_file
                or os.path.splitext(filename)[1].lower() in skip_extensions
            ):
                continue

            file_path = os.path.join(dirpath, filename)

            # Write header
            header = f"\n=== {file_path} ===\n".encode("utf-8")
            out_f.write(header)

            try:
                # Read file in binary mode
                with open(file_path, "rb") as in_f:
                    out_f.write(in_f.read())
            except Exception as e:
                # Log any errors
                error_msg = f"\n[Error reading {file_path}: {e}]\n".encode("utf-8")
                out_f.write(error_msg)

            out_f.write(b"\n\n")  # separate files
