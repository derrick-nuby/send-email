import { Response, Request } from "express";
import { ISubscriber } from "../types/subscriber.js";
import Subscriber from "../models/subscriber.js";
import Segment from "../models/segment.js";
import mongoose, { Types } from "mongoose";
import { csvToJson } from "../utils/csvToJsonCustom.js";
import fs from "fs";

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

interface ValidationError {
    row: number;
    errors: string[];
    data: any;
}

interface PreviewResult {
    totalRows: number;
    validSubscribers: {
        count: number;
        sample: ISubscriber[];
    };
    invalidEntries: {
        count: number;
        errors: ValidationError[];
    };
    summary: {
        [key: string]: number;
    };
}

interface BulkDeleteResult {
    deletedCount: number;
    notFoundIds: string[];
}


const getAllAppSubscribers = async (req: Request, res: Response): Promise<any> => {
    try {
        const subscribers: ISubscriber[] = await Subscriber
            .find()
            .populate({
                path: 'segmentId',
                model: Segment,
                select: '_id name description createdBy',
                populate: {
                    path: 'createdBy',
                    model: 'User',
                    select: '_id name email',
                },
            });

        if (subscribers.length <= 0) {
            return res.status(404).json({ message: "there are no subscribers" });
        }

        return res.status(200).json({ subscribers });

    } catch (error) {
        return res.status(500).json({ error: "Failed to retrieve subscribers" });
    }
};

const getSubscribersBySegment = async (req: Request, res: Response): Promise<any> => {
    try {
        const segmentId = req.params.segmentId;
        const userId = req.userId;

        const subscribers: ISubscriber[] = await Subscriber.find({ segmentId, createdBy: userId }).populate({
            path: 'segmentId',
            model: Segment,
            select: '_id name description createdBy',
            populate: {
                path: 'createdBy',
                model: 'User',
                select: '_id name email',
            },
        });


        if (subscribers.length <= 0) {
            return res.status(404).json({ message: "there are no subscribers" });
        }

        return res.status(200).json({ subscribers });

    } catch (error) {
        return res.status(500).json({ error: "Failed to retrieve subscribers" });
    }
};

const getSubscribers = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = req.userId;

        const subscribers: ISubscriber[] = await Subscriber.find({ createdBy: userId }).populate({
            path: 'segmentId',
            model: Segment,
            select: '_id name description createdBy',
            populate: {
                path: 'createdBy',
                model: 'User',
                select: '_id name email',
            },
        });

        if (subscribers.length <= 0) {
            return res.status(404).json({ message: "there are no subscribers" });
        }

        return res.status(200).json({ subscribers });

    } catch (error) {
        return res.status(500).json({ error: "Failed to retrieve subscribers" });
    }
};

const getSingleSubscriber = async (req: Request, res: Response): Promise<any> => {
    try {

        const userId = req.userId;
        const subscriberID = req.params.id;

        const subscriber: ISubscriber | null = await Subscriber
            .findOne({ _id: subscriberID, createdBy: userId })
            .populate({
                path: 'segmentId',
                model: Segment,
                select: '_id name description createdBy',
                populate: {
                    path: 'createdBy',
                    model: 'User',
                    select: '_id name email',
                },
            });

        if (!subscriber) {
            return res.status(404).json({ message: "that subscriber doesnt exist" });
        }

        return res.status(200).json({ subscriber });

    } catch (error) {
        return res.status(500).json({ error: "Failed to retrieve subscriber" });
    }
};

const createSubscriber = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email, notes, segmentId, customFields } = req.body;

        const userId = req.userId;

        const subscriber: ISubscriber = new Subscriber({
            name,
            email,
            notes,
            segmentId,
            createdBy: userId,
            isSubscribed: true,
            customFields,
        });

        const newSubscriber: ISubscriber = await subscriber.save();

        return res.status(201).json({ newSubscriber });

    } catch (error) {
        console.error('Error creating subscriber:', error);
        res.status(500).json({ error: 'Failed to create subscriber' });
    }
};

const updateSubscriber = async (req: Request, res: Response): Promise<any> => {
    try {

        const userId = req.userId;
        const subscriberID = req.params.id;
        const updateFields = req.body;

        const updatedSubscriber: ISubscriber | null = await Subscriber.findOneAndUpdate(
            { _id: subscriberID, createdBy: userId },
            updateFields,
            { new: true }
        );

        if (!updatedSubscriber) {
            return res.status(404).json({ message: "that subscriber doesnt exist" });
        }

        return res.status(200).json({ updatedSubscriber });

    } catch (error) {
        console.log(error);

    }
};

const deleteSubscriber = async (req: Request, res: Response): Promise<any> => {
    try {

        const userId = req.userId;
        const subscriberID = req.params.id;

        const deletedSubscriber: ISubscriber | null = await Subscriber.findOneAndDelete({ _id: subscriberID, createdBy: userId });

        if (!deletedSubscriber) {
            return res.status(404).json({ message: "that subscriber doesnt exist" });
        }

        return res.status(200).json({ deletedSubscriber });

    } catch (error) {
        console.log(error);

    }
};

const bulkDeleteSubscribers = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = new Types.ObjectId(req.userId);
        const subscriberIds = req.body.subscriberIds;

        if (!Array.isArray(subscriberIds) || subscriberIds.length === 0) {
            res.status(400).json({ message: "Invalid input: subscriberIds must be a non-empty array" });
            return;
        }

        const objectIds = subscriberIds.filter(Types.ObjectId.isValid).map(id => new Types.ObjectId(id));
        if (objectIds.length !== subscriberIds.length) {
            res.status(400).json({ message: "One or more subscriberIds are invalid" });
            return;
        }

        const userSubscribers = await Subscriber.find({
            _id: { $in: objectIds },
            createdBy: userId
        }).select('_id');

        const userSubscriberIds = userSubscribers.map(sub => sub._id);

        const deleteResult = await Subscriber.deleteMany({
            _id: { $in: userSubscriberIds }
        });

        const notFoundIds = objectIds
            // @ts-ignore
            .filter(id => !userSubscriberIds.some(subId => subId.equals(id)))
            .map(id => id.toString());

        const result: BulkDeleteResult = {
            deletedCount: deleteResult.deletedCount,
            notFoundIds: notFoundIds
        };

        if (result.deletedCount === 0 && notFoundIds.length === 0) {
            res.status(404).json({ message: "No subscribers found for the given IDs", result });
        } else if (result.deletedCount === 0) {
            res.status(404).json({ message: "No subscribers were deleted. All provided IDs were not found", result });
        } else {
            res.status(200).json({
                message: `${result.deletedCount} subscribers deleted successfully${notFoundIds.length > 0 ? `. ${notFoundIds.length} IDs were not found` : ''}`,
                result: result
            });
        }

    } catch (error) {
        console.error('Error in bulkDeleteSubscribers:', error);
        res.status(500).json({
            message: 'Failed to delete subscribers',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

const uploadSubscribersByCSV = async (req: MulterRequest, res: Response): Promise<void> => {
    try {
        const userId = new Types.ObjectId(req.userId);

        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const filePath = req.file.path;

        const { validSubscribers, invalidEntries } = await csvToJson(filePath, userId);

        fs.unlinkSync(filePath);

        const batchSize = 100;
        const insertedSubscribers: ISubscriber[] = [];
        const insertionErrors: { subscriber: ISubscriber; error: string; }[] = [];

        for (let i = 0; i < validSubscribers.length; i += batchSize) {
            const batch = validSubscribers.slice(i, i + batchSize);
            try {
                const result = await Subscriber.insertMany(batch, { ordered: false, rawResult: true });

                if (result.insertedCount === batch.length) {
                    insertedSubscribers.push(...batch);
                } else {
                    const insertedIds = new Set(Object.values(result.insertedIds));
                    batch.forEach((subscriber: ISubscriber, index: number) => {
                        // @ts-expect-error
                        if (insertedIds.has(subscriber._id)) {
                            insertedSubscribers.push(subscriber);
                        } else {
                            insertionErrors.push({
                                subscriber,
                                error: 'Failed to insert for unknown reason'
                            });
                        }
                    });
                }
            } catch (error) {
                // @ts-expect-error
                if (error.writeErrors) {
                    // @ts-expect-error
                    const failedIndexes = new Set(error.writeErrors.map((e: any) => e.index));
                    batch.forEach((subscriber, index) => {
                        if (failedIndexes.has(index)) {
                            insertionErrors.push({
                                subscriber,
                                // @ts-expect-error
                                error: error.writeErrors.find((e: any) => e.index === index).errmsg || 'Unknown error during insertion'
                            });
                        } else {
                            insertedSubscribers.push(subscriber);
                        }
                    });
                } else {
                    insertionErrors.push(...batch.map(subscriber => ({
                        subscriber,
                        // @ts-expect-error
                        error: error.message || 'Unknown error during insertion'
                    })));
                }
            }
        }

        res.status(200).json({
            message: `CSV processing completed`,
            totalProcessed: validSubscribers.length + invalidEntries.length,
            validSubscribers: validSubscribers.length,
            invalidEntries: invalidEntries.length,
            insertedSubscribers: insertedSubscribers.length,
            insertionErrors: insertionErrors.length,
            details: {
                invalidEntries,
                validSubscribers,
                insertedSubscribers,
                insertionErrors
            }
        });
    } catch (error) {
        console.error('Error in csvTesting controller:', error);
        // @ts-expect-error
        res.status(500).json({ message: 'Failed to process CSV', error: error.message });
    }
};

const searchSubscriber = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = new Types.ObjectId(req.userId);
        const searchQuery = req.query.query as string;
        const subscribed = req.query.subscribed as string;
        const segmentId = req.query.segmentid as string;


        if (!mongoose.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ error: "Invalid user ID" });
            return;
        }

        const filter: any = {
            createdBy: new mongoose.Types.ObjectId(userId)
        };

        if (searchQuery && searchQuery.length >= 2) {
            const regex = new RegExp(searchQuery, 'i');

            filter.$or = [
                { name: { $regex: regex } },
                { email: { $regex: regex } },
                { notes: { $regex: regex } },
                {
                    $expr: {
                        $gt: [
                            {
                                $size: {
                                    $filter: {
                                        input: { $objectToArray: "$customFields" },
                                        as: "field",
                                        cond: { $regexMatch: { input: "$$field.v", regex: regex } }
                                    }
                                }
                            },
                            0
                        ]
                    }
                }
            ];
        }
        const isSubscribed = subscribed === 'true' ? true : subscribed === 'false' ? false : undefined;

        if (isSubscribed !== undefined) {
            filter.isSubscribed = isSubscribed;
        }

        if (segmentId) {
            filter.segmentId = segmentId;
        }

        const subscribers = await Subscriber.find(filter)
            .populate({
                path: 'segmentId',
                model: Segment,
                select: '_id name description',
            });

        if (subscribers.length <= 0) {
            res.status(404).json({ error: "No subscribers found for your search; please search again." });
            return;
        }

        res.status(200).json({ subscribers });

    } catch (error) {
        console.error('Error searching subscribers:', error);
        res.status(500).json({ error: "An error occurred while searching for subscribers." });
    }
};

const changeSubscriberSegment = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = new Types.ObjectId(req.userId);
        const { subscriberIds, newSegmentId } = req.body;

        if (!Types.ObjectId.isValid(newSegmentId)) {
            res.status(400).json({ error: 'Invalid newSegmentId' });
            return;
        }

        if (!Array.isArray(subscriberIds) || subscriberIds.length === 0) {
            res.status(400).json({ error: 'subscriberIds must be a non-empty array' });
            return;
        }

        const subscriberObjectIds = subscriberIds.map((id: string) => new Types.ObjectId(id));

        const result = await Subscriber.updateMany(
            {
                _id: { $in: subscriberObjectIds },
                createdBy: userId
            },
            {
                $set: { segmentId: new Types.ObjectId(newSegmentId) }
            }
        );

        if (result.modifiedCount === 0) {
            res.status(404).json({ error: 'No subscribers found or updated. Make sure they exist and belong to you.' });
        } else {
            res.status(200).json({ message: `${result.modifiedCount} subscribers were updated successfully.` });
        }

    } catch (error) {
        console.error('Error updating subscriber segment:', error);
        res.status(500).json({ error: 'An error occurred while updating subscribers.' });
    }
};

const previewUpload = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = new Types.ObjectId(req.userId);

        if (!req.file) {
            res.status(400).json({ message: 'No file uploaded' });
            return;
        }

        const filePath = req.file.path;

        const { validSubscribers, invalidEntries } = await csvToJson(filePath, userId);

        fs.unlinkSync(filePath);

        const result: PreviewResult = {
            totalRows: validSubscribers.length + invalidEntries.length,
            validSubscribers: {
                count: validSubscribers.length,
                sample: validSubscribers.slice(0, 5)
            },
            invalidEntries: {
                count: invalidEntries.length,
                errors: invalidEntries
            },
            summary: {}
        };

        invalidEntries.forEach((entry) => {
            entry.errors.forEach((error) => {
                result.summary[error] = (result.summary[error] || 0) + 1;
            });
        });

        res.status(200).json({
            message: 'CSV preview processed successfully',
            result
        });

    } catch (error) {
        console.error('Error in previewUpload function:', error);
        res.status(500).json({
            message: 'Failed to process CSV for preview',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

const addBulkJsonSubscribers = async (req: Request, res: Response): Promise<any> => {
    try {
        const userId = new Types.ObjectId(req.userId);
        const subscribersData = req.body;

        const subscribers = subscribersData.map((data: any) => {
            const { name, email, notes, segmentId, isSubscribed, customFields, ...rest } = data;
            return {
                name,
                email,
                notes,
                segmentId,
                createdBy: userId,
                isSubscribed: isSubscribed !== undefined ? isSubscribed : true,
                customFields: { ...customFields, ...rest },
            };
        });

        const result = await Subscriber.insertMany(subscribers, { ordered: false });

        res.status(201).json({
            message: `${result.length} subscribers added successfully`,
            subscribers: result,
        });
    } catch (error) {
        console.error('Error adding bulk JSON subscribers:', error);
        res.status(500).json({ error: 'Failed to add subscribers' });
    }
};

export { getSubscribers, getSingleSubscriber, createSubscriber, updateSubscriber, deleteSubscriber, getSubscribersBySegment, getAllAppSubscribers, uploadSubscribersByCSV, searchSubscriber, changeSubscriberSegment, previewUpload, bulkDeleteSubscribers, addBulkJsonSubscribers };
