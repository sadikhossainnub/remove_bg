"""
rembg_worker.py — stdin থেকে image নিয়ে stdout এ PNG output দেয়।
Node.js থেকে call হয়: python rembg_worker.py < input.jpg > output.png
"""
import sys
from rembg import remove
from PIL import Image
import io

def main():
    input_data = sys.stdin.buffer.read()
    input_image = Image.open(io.BytesIO(input_data))
    output_image = remove(input_image)
    output_buffer = io.BytesIO()
    output_image.save(output_buffer, format='PNG')
    sys.stdout.buffer.write(output_buffer.getvalue())

if __name__ == '__main__':
    main()
