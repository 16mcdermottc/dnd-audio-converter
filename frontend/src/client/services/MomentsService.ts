/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Moment } from '../models/Moment';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MomentsService {
    /**
     * List Moments
     * @param campaignId
     * @param sessionId
     * @returns Moment Successful Response
     * @throws ApiError
     */
    public static listMomentsMomentsGet(
        campaignId?: (number | null),
        sessionId?: (number | null),
    ): CancelablePromise<Array<Moment>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/moments/',
            query: {
                'campaign_id': campaignId,
                'session_id': sessionId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Moment
     * @param momentId
     * @returns Moment Successful Response
     * @throws ApiError
     */
    public static getMomentMomentsMomentIdGet(
        momentId: number,
    ): CancelablePromise<Moment> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/moments/{moment_id}',
            path: {
                'moment_id': momentId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Moment
     * @param momentId
     * @param requestBody
     * @returns Moment Successful Response
     * @throws ApiError
     */
    public static updateMomentMomentsMomentIdPut(
        momentId: number,
        requestBody: Moment,
    ): CancelablePromise<Moment> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/moments/{moment_id}',
            path: {
                'moment_id': momentId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Moment
     * @param momentId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteMomentMomentsMomentIdDelete(
        momentId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/moments/{moment_id}',
            path: {
                'moment_id': momentId,
            },
            errors: {
                404: `Not found`,
                422: `Validation Error`,
            },
        });
    }
}
