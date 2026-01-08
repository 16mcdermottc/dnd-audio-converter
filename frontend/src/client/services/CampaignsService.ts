/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Campaign } from '../models/Campaign';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class CampaignsService {
    /**
     * List Campaigns
     * @returns Campaign Successful Response
     * @throws ApiError
     */
    public static listCampaignsCampaignsGet(): CancelablePromise<Array<Campaign>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/campaigns/',
        });
    }
    /**
     * Create Campaign
     * @param requestBody
     * @returns Campaign Successful Response
     * @throws ApiError
     */
    public static createCampaignCampaignsPost(
        requestBody: Campaign,
    ): CancelablePromise<Campaign> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/campaigns/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Get Campaign
     * @param campaignId
     * @returns Campaign Successful Response
     * @throws ApiError
     */
    public static getCampaignCampaignsCampaignIdGet(
        campaignId: number,
    ): CancelablePromise<Campaign> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/campaigns/{campaign_id}',
            path: {
                'campaign_id': campaignId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Delete Campaign
     * @param campaignId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static deleteCampaignCampaignsCampaignIdDelete(
        campaignId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/campaigns/{campaign_id}',
            path: {
                'campaign_id': campaignId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
    /**
     * Generate Campaign Summary
     * @param campaignId
     * @returns any Successful Response
     * @throws ApiError
     */
    public static generateCampaignSummaryCampaignsCampaignIdGenerateSummaryPost(
        campaignId: number,
    ): CancelablePromise<any> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/campaigns/{campaign_id}/generate_summary',
            path: {
                'campaign_id': campaignId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }
}
