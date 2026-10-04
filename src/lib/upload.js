import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase.js";


const Upload = async (file, userId) => {
  // Generate a unique filename using userId and timestamp
  const timestamp = Date.now();
  const uniqueFilename = `${userId}_${timestamp}_${file.name}`;
  
  // Create a reference to 'avatars/userId/uniqueFilename'
  const storageRef = ref(storage, `avatars/${userId}/${uniqueFilename}`);


  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress + '% done');
      },
      (error) => {
        reject("Something went wrong! " + error.code);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        });
      }
    );
  });
};

export default Upload;