/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Highlight } from '../models/Highlight';
import type { Quote } from '../models/Quote';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class HighlightsQuotesMomentsService {
    /**
     * Update Highlight
     * @param id
     * @param requestBody
     * @returns Highlight Successful Response
     * @throws ApiError
     */
    public static updateHighlightHighlightsIdPut(
        id: number,
        requestBody: Highlight,
    ): CancelablePromise<Highlight> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/highlights/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Highlight
     * @param id
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteHighlightHighlightsIdDelete(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/highlights/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Update Quote
     * @param id
     * @param requestBody
     * @returns Quote Successful Response
     * @throws ApiError
     */
    public static updateQuoteQuotesIdPut(
        id: number,
        requestBody: Quote,
    ): CancelablePromise<Quote> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/quotes/{id}',
            path: {
                'id': id,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Quote
     * @param id
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteQuoteQuotesIdDelete(
        id: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/quotes/{id}',
            path: {
                'id': id,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Highlights
     * @param campaignId
     * @returns Highlight Successful Response
     * @throws ApiError
     */
    public static listHighlightsHighlightsGet(
        campaignId?: number,
    ): CancelablePromise<Array<Highlight>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/highlights/',
            query: {
                'campaign_id': campaignId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * List Quotes
     * @param campaignId
     * @returns Quote Successful Response
     * @throws ApiError
     */
    public static listQuotesQuotesGet(
        campaignId?: number,
    ): CancelablePromise<Array<Quote>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/quotes/',
            query: {
                'campaign_id': campaignId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
