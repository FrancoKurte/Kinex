from django.db import models
from random import choices
from string import ascii_letters, digits
from Biomecanica.settings import BASE_DIR

# Represents a user image with file, URL, and image data directory.
class UserImage:
    def __init__(self, file, url, dir):
        self.id = None  # Initialize ID as None
        self.file = file
        self.url = url
        self.dir = dir

    def get_id(self):
        """Returns the image ID."""
        return self.id

    def get_file(self):
        """Returns the image file information."""
        return self.file

    def get_url(self):
        """Returns the image URL (if available)."""
        return self.url

    def get_image(self):
        """Returns the image data."""
        return self.image_data

# Manages a collection of images, ensuring unique IDs.
class ImageCollection:
    # Combine letters and digits
    CHARSET = ascii_letters + digits

    def __init__(self):
        self.images = list()

    # Checks if an image with the given ID exists
    def check_id(self, id):
        return any(image.get_id() == id for image in self.images)

    # Generates a unique alphanumeric ID of the specified length
    def generate_id(self, length=5):
        while True:
            new_id = ''.join(choices(self.CHARSET, k=length))
            if not self.check_id(new_id):
                return new_id
            
    # Assigns a unique ID to the image.
    def set_id(self, image):
        image.id = self.generate_id()

    # Add the image to the collection
    def add_image(self, image):
        self.set_id(image)
        self.images.append(image)

    # Save the added image locally
    def save_image(self, image):
        if self.check_id(image.get_id()):
            BASE_DIR
