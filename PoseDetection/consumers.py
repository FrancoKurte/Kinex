from channels.generic.websocket import StopConsumer, AsyncWebsocketConsumer
from pathlib import Path
import secrets, json, os, base64
import mediapipe as mp
import numpy as np
import cv2

# Define base directory
BASE_DIR = Path(__file__).resolve().parent.parent

# Initialize MediaPipe Pose model
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    enable_segmentation=False,
    min_detection_confidence=0.75
)

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

# User class to handle individual user data
class User:
    def __init__(self, user_id, connection):
        self.user_id = user_id
        self.connection = connection
        self.code = None
        self.type = None

    def get_id(self):
        return self.user_id

    def get_code(self):
        return self.code

    def get_type(self):
        return self.type

    def connect(self):
        return self.connection

    def set_code(self, code):
        self.code = code

    def set_type(self, type):
        self.type = type

# Group class to handle groups of users
class Group:
    def __init__(self, code):
        self.code = code
        self.members = []
        self.counter = 0

    def get_code(self):
        return self.code

    def get_members(self):
        return self.members

    def add_member(self, member):
        if len(self.members) < 2:
            self.members.append(member)
            return True
        return False

# Consumer class to handle WebSocket connections
class VideoConsumer(AsyncWebsocketConsumer): 
    users = {}
    groups = {}
    desktop_client = None
    mobile_client = None
    start_transmission = False
    code = None
    type_of_data = "image"
    triplet = None
    joint = medial = lateral = 0
    bytes_array = bytearray()
    isRecording = False

    async def connect(self):
        await self.accept()
        user_id = self.generate_id()
        self.users[user_id] = User(user_id, self)
        self.clear_buffer()
        await self.send_json({"id": user_id, "message": "user-id", "data": 1})
        print(f"User Created. User ID: {user_id} \n Users: {self.users}")  # Debug

    async def disconnect(self, close_code):
        raise StopConsumer()

    async def receive(self, text_data=None, bytes_data=None):
        if text_data:
            await self.handle_text_data(text_data)
        if bytes_data and self.isRecording:
            await self.process_image(bytes_data)

    async def handle_text_data(self, text_data):
        json_data = json.loads(text_data)
        user_id = json_data["id"]
        message = json_data["message"]
        data = json_data["data"]

        if message == "set-user-type":
            await self.set_user_type(user_id, data)

        elif message == "start-recording":
            self.isRecording = True

        elif message == "set-triplet":
            self.triplet = triplets.get(data)

        elif message == "set-code":
            await self.handle_set_code(user_id, data)

        elif message == "stop-recording":
            self.isRecording = False
            await self.send_json({"id": user_id, "message": "Recording Stopped", "data": 1})

        elif message == "start-transmission":
            await self.handle_start_transmission(user_id, data)

        elif message == "disconnect":
            await self.handle_disconnect(user_id, data)

    async def set_user_type(self, user_id, data):
        if data == "desktop":
            self.users[user_id].set_type("desktop")
            self.desktop_client = user_id
            print(f"Setting user {self.desktop_client} to {data} type.")
        elif data == "mobile":
            self.users[user_id].set_type("mobile")
            self.mobile_client = user_id
            print(f"Setting user {self.mobile_client} to {data} type.")

    async def handle_set_code(self, user_id, code):
        self.code = code
        self.users[user_id].set_code(code)
        if code not in self.groups:
            self.groups[code] = Group(code)
            self.groups[code].add_member(self.users[user_id])
            print(f"Groups: {self.groups} \n Group: {self.groups[code]}")
            await self.send_json({"id": user_id, "message": "Code is accepted.", "data": code})
        else:
            if not self.groups[code].add_member(self.users[user_id]):
                await self.send_json({"id": user_id, "message": "Group is at maximum capacity.", "data": 0})

    async def handle_start_transmission(self, user_id, code):
        self.isRecording = True
        self.code = code
        self.start_transmission = True
        self.groups[code].add_member(self.users[user_id])
        self.users[user_id].set_code(code)
        await self.send_json({"id": user_id, "message": "Transmission Initiated.", "data": code})
        print("Transmission can be initiated")
        print(f"Groups: {self.groups} \n Group: {self.groups[code]} \n {self.groups[code].get_members()}")

    async def handle_disconnect(self, user_id, code):
        if user_id in self.users:
            del self.users[user_id]
        if code in self.groups:
            del self.groups[code]
        self.clear_buffer()
        print(f"User Deleted. Users: {self.users}")

    async def process_image(self, bytes_data):
        try:
            uint8_data = np.frombuffer(bytes_data, np.uint8)
            image = cv2.imdecode(uint8_data, cv2.IMREAD_COLOR)
            height, width, channel = image.shape
            image.flags.writeable = False
            results = pose.process(image)
            landmark_data = None

            if results.pose_landmarks:
                image.flags.writeable = True
                if self.triplet:
                    self.joint, self.medial, self.lateral = (
                        results.pose_landmarks.landmark[self.triplet[0]],
                        results.pose_landmarks.landmark[self.triplet[1]],
                        results.pose_landmarks.landmark[self.triplet[2]]
                    )
                    landmark_data = {
                        "joint": (self.joint.x, self.joint.y),
                        "medial": (self.medial.x, self.medial.y),
                        "lateral": (self.lateral.x, self.lateral.y),
                    }
                    self.draw_landmarks(image, width, height)

            image = cv2.flip(image, 1)
            await self.send_image(image, landmark_data)
        except Exception as e:
            print(f"Error processing image: {e}")

    def draw_landmarks(self, image, width, height):
        colors = [(40, 220, 40), (220, 40, 40), (40, 40, 220)]
        for i, landmark in enumerate([self.joint, self.medial, self.lateral]):
            cv2.drawMarker(
                image,
                (int(landmark.x * width), int(landmark.y * height)),
                colors[i],
                markerType=cv2.MARKER_CROSS,
                markerSize=15,
                thickness=10,
            )
        cv2.line(
            image,
            (int(self.medial.x * width), int(self.medial.y * height)),
            (int(self.joint.x * width), int(self.joint.y * height)),
            (255, 255, 255),
            thickness=2,
        )
        cv2.line(
            image,
            (int(self.joint.x * width), int(self.joint.y * height)),
            (int(self.lateral.x * width), int(self.lateral.y * height)),
            (255, 255, 255),
            thickness=2,
        )

    async def send_image(self, image, landmark_data):
        _, buffer = cv2.imencode('.png', image)
        image_bytes = buffer.tobytes()
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')

        if self.code:
            for user in self.groups[self.code].get_members():
                if user.get_type() == "desktop":
                    await user.connect().send(image_base64)
                    if self.triplet and landmark_data:
                        await user.connect().send(json.dumps({
                            "id": self.code,
                            "message": "landmark-data",
                            "data": landmark_data,
                        }))
        else:
            await self.users[self.desktop_client].connect().send(image_base64)
            if self.triplet and landmark_data:
                await self.users[self.desktop_client].connect().send(json.dumps({
                    "id": self.code,
                    "message": "landmark-data",
                    "data": landmark_data,
                }))
 
    def clear_buffer(self):
        self.bytes_array = bytearray()
        print("Buffer has been cleared.")

    def clear_storage(self, file):
        if os.path.exists(file):
            os.remove(file)
        print(f"Clearing local storage. {file} deleted.")

    def generate_id(self):
        return secrets.token_hex(nbytes=4)

    async def send_json(self, data):
        await self.send(text_data=json.dumps(data))
