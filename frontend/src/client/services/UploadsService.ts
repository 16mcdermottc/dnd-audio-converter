/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_reupload_session_reupload_session__session_id__post } from '../models/Body_reupload_session_reupload_session__session_id__post';
import type { Body_upload_session_upload_session__post } from '../models/Body_upload_session_upload_session__post';
import type { LocalSessionRequest } from '../models/LocalSessionRequest';
import type { TextImportRequest } from '../models/TextImportRequest';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class UploadsService {
    /**
     * Import Session Text
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static importSessionTextImportSessionTextPost(
        requestBody: TextImportRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/import_session_text/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Upload Session
     * @param name
     * @param campaignId
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static uploadSessionUploadSessionPost(
        name: string,
        campaignId: number,
        formData: Body_upload_session_upload_session__post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/upload_session/',
            query: {
                'name': name,
                'campaign_id': campaignId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Import Local Session
     * @param requestBody
     * @returns any Successful Response
     * @throws ApiError
     */
    public static importLocalSessionImportLocalSessionPost(
        requestBody: LocalSessionRequest,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/import_local_session/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Reupload Session
     * @param sessionId
     * @param formData
     * @returns any Successful Response
     * @throws ApiError
     */
    public static reuploadSessionReuploadSessionSessionIdPost(
        sessionId: number,
        formData: Body_reupload_session_reupload_session__session_id__post,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/reupload_session/{session_id}',
            path: {
                'session_id': sessionId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
