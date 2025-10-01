import os
import shutil
import sys

def delete_folder(folder_path):
    """
    Deletes the specified folder and its contents.
    """
    try:
        if os.path.exists(folder_path):
            shutil.rmtree(folder_path)
            print(f"Folder '{folder_path}' has been deleted successfully.")
        else:
            print(f"Folder '{folder_path}' does not exist.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    folder_to_delete = sys.argv[1]
    delete_folder(folder_to_delete)
