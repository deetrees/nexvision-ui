import os
import genai
from PIL import Image
from io import BytesIO

def generate_image(prompt, input_image_path=None, output_path="generated_image.png"):
    """Generate image using Google Gemini API"""
    
    # Initialize client
    client = genai.Client()
    
    # Prepare contents
    contents = [prompt]
    if input_image_path and os.path.exists(input_image_path):
        image = Image.open(input_image_path)
        contents.append(image)
    
    # Generate content
    response = client.models.generate_content(
        model="gemini-2.5-flash-image-preview",
        contents=contents,
    )
    
    # Process response
    for part in response.candidates[0].content.parts:
        if part.text is not None:
            print(part.text)
        elif part.inline_data is not None:
            image = Image.open(BytesIO(part.inline_data.data))
            image.save(output_path)
            print(f"Image saved to {output_path}")

if __name__ == "__main__":
    prompt = "Create a picture of my cat eating a nano-banana in a fancy restaurant under the Gemini constellation"
    generate_image(prompt)
