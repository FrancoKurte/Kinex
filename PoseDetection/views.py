from django.shortcuts import render
from django.http import HttpResponse
from django.views.generic import View
import numpy as np
import cv2
import mediapipe as mp
import base64
import json

# Initialize MediaPipe Pose model
mp_pose = mp.solutions.pose 

# Define joint triplets for angle calculation
triplets = {
    "left-shoulder": (11, 13, 23),
    "right-shoulder": (12, 14, 24),
    "left-elbow": (13, 11, 15),
    "right-elbow": (14, 12, 16),
    "left-hip": (23, 24, 25),
    "right-hip": (24, 23, 26),
    "left-knee": (25, 24, 28),
    "right-knee": (26, 23, 27),
}

# View for index.html
class IndexView(View):
    def get(self, request, *args, **kwargs):
        return render(request, "index.html")

# View for image_processing.html
class ImageView(View):
    def get(self, request, *args, **kwargs):
        return render(request, "image.html")

    def post(self, request, *args, **kwargs):
        uploaded_file = request.FILES.get('file')
        if uploaded_file:
            if request.headers.get("x-post-purpose") == "image-processing":
                # Read the contents of the uploaded file
                image_data = uploaded_file.read()
                image = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)

                # Initialize the MediaPipe Pose model
                pose = mp_pose.Pose(static_image_mode=True, model_complexity=2, enable_segmentation=True, min_detection_confidence=0.8)

                # Detect the pose landmarks
                results = pose.process(image)

                if results.pose_landmarks:
                    # Get image dimensions
                    height, width, _ = image.shape
                    
                    # Process each triplet
                    angles_data = {}
                    for name, (joint_idx, medial_idx, lateral_idx) in triplets.items():
                        joint = results.pose_landmarks.landmark[joint_idx]
                        medial = results.pose_landmarks.landmark[medial_idx]
                        lateral = results.pose_landmarks.landmark[lateral_idx]

                        # Calculate the angle
                        angle = self.calculate_angle(joint, medial, lateral)
                        
                        # Draw landmarks
                        self.draw_landmarks(image, joint, medial, lateral, width, height)
                        
                        # Store angle data
                        angles_data[name] = {
                            "angle": angle,
                            "joint": (joint.x, joint.y),
                            "medial": (medial.x, medial.y),
                            "lateral": (lateral.x, lateral.y)
                        }

                    # Encode the processed image to bytes
                    _, buffer = cv2.imencode('.png', image)
                    image_bytes = buffer.tobytes()

                    # Create response data with image and angles
                    response_data = {
                        "image": base64.b64encode(image_bytes).decode('utf-8'),
                        "angles": angles_data
                    }

                    return HttpResponse(json.dumps(response_data), content_type='application/json')

                return HttpResponse("No landmarks detected", status=400)

            elif request.headers.get("x-post-purpose") == "save-image":
                # Save the uploaded image to disk
                image_data = uploaded_file.read()
                image = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
                cv2.imwrite("uploaded_image.png", image)
                return HttpResponse("Image saved successfully", status=200)

        return HttpResponse("No file uploaded", status=400)

    def calculate_angle(self, joint, medial, lateral):
        # Calculate the angle between the three points
        a = np.array([medial.x, medial.y])
        b = np.array([joint.x, joint.y])
        c = np.array([lateral.x, lateral.y])
        
        ba = a - b
        bc = c - b
        
        cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc))
        angle = np.degrees(np.arccos(cosine_angle))
        
        return angle

    def draw_landmarks(self, image, joint, medial, lateral, width, height):
        # Draw landmarks and connecting lines on the image
        points = [(medial, (220, 40, 40)), (joint, (40, 220, 40)), (lateral, (40, 40, 220))]
        cv2.line(image, (int(medial.x * width), int(medial.y * height)), (int(joint.x * width), int(joint.y * height)), (255, 255, 255), 5)
        cv2.line(image, (int(joint.x * width), int(joint.y * height)), (int(lateral.x * width), int(lateral.y * height)), (255, 255, 255), 5)
        for point, color in points:
            cv2.drawMarker(image, (int(point.x * width), int(point.y * height)), color, markerType=cv2.MARKER_CROSS, markerSize=10, thickness=10)

# View for video_processing.html
class VideoView(View):
    def get(self, request, *args, **kwargs):
        return render(request, "video.html")
