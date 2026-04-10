export const BASE_URL = 'https://ai-interview-preparation-uw13.onrender.com'



export const API_PATH = {
    AUTH : {
        REGISTER : '/api/auth/register',
        LOGIN : '/api/auth/login',
        GET_PROFILE : '/api/auth/profile'
    },

    AI :{
        GENERATE_QUESTIONS : "/api/ai/generate-questions",
        GENERATE_EXPLANATION : "/api/ai/generate-explanation"
    },

    QUESTION :{
        ADD_TO_SESSION : '/api/questions/add',
        PIN : (id) => `/api/questions/${id}/pin`,
        NOTE :(id) =>`/api/questions/${id}/note`
    },
    SESSION : {
        CREATE : '/api/sessions/create',
        GET_ALL : '/api/sessions/my-sessions',
        GET_ONE :(id) => `/api/sessions/${id}`,
        DELETE : (id) => `/api/sessions/${id}`
    },
    IMAGE :{
        UPLOAD_IMAGE : '/api/auth/upload-image',
    }
}