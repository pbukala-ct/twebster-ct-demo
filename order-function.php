<?php

declare(strict_types=1);

use Google\Cloud\PubSub\PubSubClient;
use Dotenv\Dotenv;
use GuzzleHttp\Client;

require 'vendor/autoload.php';

$dotenv = Dotenv::createImmutable(__DIR__, $_ENV['ENV_PATH'] ?? '.env');
$dotenv->load();

const VERBOSE = true;

function handler($event, $context)
{
    $message = json_decode(base64_decode($event['data']), true);

    if (VERBOSE) {
        echo 'message: ' . json_encode($message) . PHP_EOL;
    }

    $updateOrderId = $message['resource']['id'];

    $apiRoot = new Client([
        'base_uri' => $_ENV['CT_API_URL'],
        'headers' => [
            'Authorization' => 'Bearer ' . $_ENV['CT_AUTH_TOKEN'],
        ],
    ]);

    $result = $apiRoot->get("orders/{$updateOrderId}")->getBody()->getContents();
    $order = json_decode($result, true);

    if (!$order) {
        echo "Unable to fetch order {$message['resource']['id']}" . PHP_EOL;
        return;
    }

    if (VERBOSE) {
        echo 'order: ' . json_encode($order, JSON_PRETTY_PRINT) . PHP_EOL;
        echo 'Preparing Update Actions' . PHP_EOL;
    }

    $currentTimestamp = (new DateTime())->format(DateTime::ATOM);
    $orderID = 'TW_Order_ID_' . (random_int(1, 1000) + 1);
    $FTchanelsIDs = getFullfilmentChannels($apiRoot);

    $actions = [
        [
            'action' => 'changeOrderState',
            'orderState' => 'Confirmed',
        ],
        [
            'action' => 'transitionState',
            'state' => [
                'typeId' => 'state',
                'key' => 'ordercreated',
            ],
        ],
        [
            'action' => 'changePaymentState',
            'paymentState' => 'Paid',
        ],
        [
            'action' => 'setCustomType',
            'type' => [
                'id' => 'c4adefae-416e-4bef-8e90-aac4a65ad7b0',
                'typeId' => 'type',
            ],
            'fields' => [
                'channel' => [
                    'typeId' => 'channel',
                    'id' => getRandomChannelId($FTchanelsIDs),
                ],
                'timestamp' => $currentTimestamp,
                'omsId' => $orderID,
            ],
        ],
    ];

    $updateResult = $apiRoot->post("orders/{$updateOrderId}", [
        'json' => [
            'version' => $order['version'],
            'actions' => $actions,
        ],
    ])->getBody()->getContents();

    if (!$updateResult) {
        echo "Unable to update order {$updateOrderId}" . PHP_EOL;
        return;
    }

    if (VERBOSE) {
        echo 'Exiting order update' . PHP_EOL;
    }
}

function getRandomChannelId(array $channelIds): string
{
    return $channelIds[array_rand($channelIds)];
}

function getFullfilmentChannels(Client $apiRoot): array
{
    $channelResults = $apiRoot->get('channels', [
        'query' => [
            'where' => 'roles contains any ("InventorySupply")',
            'expand' => ['custom.type', 'custom.fields.isStore'],
            'limit' => 100,
        ],
    ])->getBody()->getContents();

    $channelResults = json_decode($channelResults, true);

    if (!$channelResults) {
        echo 'Unable to fetch channels' . PHP_EOL;
        return [];
    }

    $filteredChannels = array_filter($channelResults['results'], function ($channel) {
        return $channel['custom']['fields']['isStore'] ?? false;
    });

    echo 'FT channels: ' . json_encode($filteredChannels) . PHP_EOL;

    return array_map(fn($channel) => $channel['id'], $filteredChannels);
}

// Example usage for Google Cloud Functions
$pubsub = new PubSubClient();
$subscription = $pubsub->subscription($_ENV['PUBSUB_SUBSCRIPTION']);

$subscription->consume(function ($message) {
    handler(['data' => $message->data()], null);
    $message->ack();
});
