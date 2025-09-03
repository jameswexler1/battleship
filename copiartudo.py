import os

# Scan current directory
root_dir = "."
output_file = "merged_output.txt"

with open(output_file, "wb") as out_f:  # open in binary mode for all file types
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Skip hidden directories
        dirnames[:] = [d for d in dirnames if not d.startswith(".")]

        for filename in filenames:
            # Skip hidden files and the output file itself
            if filename.startswith(".") or filename == output_file:
                continue

            file_path = os.path.join(dirpath, filename)

            # Write header
            header = f"\n=== {file_path} ===\n".encode('utf-8')
            out_f.write(header)

            try:
                # Read file in binary mode
                with open(file_path, "rb") as in_f:
                    out_f.write(in_f.read())
            except Exception as e:
                # Log any errors
                error_msg = f"\n[Error reading {file_path}: {e}]\n".encode('utf-8')
                out_f.write(error_msg)

            out_f.write(b"\n\n")  # separate files
