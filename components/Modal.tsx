import { useRecoilState } from 'recoil'
import { modalState } from '../atoms/modalAtom'
import { Dialog, Transition } from '@headlessui/react'
import { CameraIcon } from '@heroicons/react/outline'
import {
  ChangeEvent,
  Fragment,
  MutableRefObject,
  useRef,
  useState,
} from 'react'
import { db, storage } from '../firebase'
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'
import { useSession } from 'next-auth/react'
import { ref, getDownloadURL, uploadString } from 'firebase/storage'

const Modal: React.FC = () => {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useRecoilState(modalState)
  const filePickerRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState<boolean>(false)
  const captionRef = useRef() as MutableRefObject<HTMLInputElement>

  // Select an Image from local file
  const addImageToPost = (e: ChangeEvent<HTMLInputElement>) => {
    const reader = new FileReader()

    // @ts-ignore
    if (e.target.files) {
      reader.readAsDataURL(e.target.files[0])
    }

    reader.onload = (readerEvent: ProgressEvent<FileReader>) => {
      // @ts-ignore
      setSelectedFile(readerEvent.target?.result)
    }
  }

  // Upload image and post to firebase
  const uploadPost = async () => {
    if (loading) return
    setLoading(true)

    const docRef = await addDoc(collection(db, 'posts'), {
      username: session?.user?.name,
      caption: captionRef.current.value,
      profileImage: session?.user?.image,
      timestamp: serverTimestamp(),
    })

    // To get the image reference
    const imageRef = ref(storage, `posts/${docRef.id}/image`)

    // Upload image to firebase storage
    await uploadString(imageRef, selectedFile!, 'data_url').then(
      async (snapshot) => {
        const downloadURL = await getDownloadURL(imageRef)
        await updateDoc(doc(db, 'posts', docRef.id), {
          image: downloadURL,
        })
      }
    )

    setIsOpen(false)
    setLoading(false)
    setSelectedFile(null)
  }

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="fixed inset-0 z-10 overflow-y-auto"
        onClose={() => setIsOpen(false)}
      >
        <div className="flex min-h-[800px] items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:min-h-screen sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
          </Transition.Child>

          <span
            aria-hidden="true"
            className="hidden sm:inline-block sm:h-screen sm:align-middle"
          >
            &#8203;
          </span>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div
              className="mb-60 inline-block transform overflow-hidden
             rounded-lg bg-white px-4 pt-5 pb-4 text-left align-bottom shadow-xl transition-all
              sm:my-8 sm:w-full sm:max-w-sm sm:p-6 sm:align-middle"
            >
              {selectedFile ? (
                <img
                  src={selectedFile}
                  onClick={() => setSelectedFile(null)}
                  alt="No Image"
                  className="h-full cursor-pointer object-contain"
                />
              ) : (
                <div
                  onClick={() => filePickerRef.current?.click()}
                  className="mx-auto flex h-12 w-12
                  cursor-pointer items-center justify-center rounded-full bg-red-100"
                >
                  <CameraIcon
                    className="h-6 w-6 text-red-600"
                    aria-hidden="true"
                  />
                </div>
              )}

              <div>
                <div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      Upload a photo
                    </Dialog.Title>

                    <div>
                      <input
                        type="file"
                        hidden
                        ref={filePickerRef}
                        onChange={addImageToPost}
                      />
                    </div>

                    <div className="mt-2">
                      <input
                        type="text"
                        ref={captionRef}
                        className="w-full border-none text-center focus:ring-0"
                        placeholder="Please enter a caption"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    onClick={uploadPost}
                    disabled={!selectedFile}
                    className="inline-flex w-full justify-center rounded-md border border-transparent
                     bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700
                     focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300
                     hover:disabled:bg-gray-300 sm:text-sm"
                  >
                    {loading ? 'Uploading...' : 'Upload Post'}
                  </button>
                </div>
              </div>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  )
}

export default Modal
