import axiosInstance from './axiosInstance'
import { API_PATH } from './apiPath'

const uploadImage = async (file) => {
  const formData = new FormData()
  formData.append('image', file)

  const { data } = await axiosInstance.post(API_PATH.IMAGE.UPLOAD_IMAGE, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data.imageurl
}

export default uploadImage
