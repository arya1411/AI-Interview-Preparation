export const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const API_PATH = {
    AUTH : {
        REGISTER : '/api/auth/register',
        LOGIN : '/api/auth/login',
        GOOGLE : '/api/auth/google',
        GET_PROFILE : '/api/auth/profile'
    },

    AI :{
        GENERATE_QUESTIONS : "/api/ai/generate-questions",
        GENERATE_EXPLANATION : "/api/ai/generate-explanation",
        GENERATE_MCQ : "/api/ai/generate-mcq",
        GENERATE_CORE_SUBJECTS : "/api/ai/generate-core-subjects"
    },

    QUESTION :{
        ADD_TO_SESSION : '/api/questions/add',
        PIN : (id) => `/api/questions/${id}/pin`,
        NOTE :(id) =>`/api/questions/${id}/note`,
        STATUS: (id) => `/api/questions/${id}/status`,
        EXPLANATION: (id) => `/api/questions/${id}/explanation`
    },
    SESSION : {
        CREATE : '/api/sessions/create',
        GET_ALL : '/api/sessions/my-sessions',
        GET_ONE :(id) => `/api/sessions/${id}`,
        DELETE : (id) => `/api/sessions/${id}`,
        COMPLETE : (id) => `/api/sessions/complete/${id}`
    },
    TEST: {
        START:  (sessionId)  => `/api/test/${sessionId}/start`,
        SUBMIT: (attemptId)  => `/api/test/${attemptId}/submit`,
        GET:    (attemptId)  => `/api/test/${attemptId}`,
        BY_SESSION: (sessionId) => `/api/test/session/${sessionId}`,
    },
    ANALYTICS : {
        GET : '/api/analytics',
        GET_WEAK_TOPICS : '/api/analytics/weak-topics'
    },
    IMAGE :{
        UPLOAD_IMAGE : '/api/auth/upload-image',
    }
}