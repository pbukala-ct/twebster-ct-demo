 {
        action: 'addDelivery',
        items: order.lineItems.map(item => ({
          id: item.id,
          quantity: item.quantity
        })),
        parcels: [
          {
            measurements: {
              heightInMillimeter: Math.floor(Math.random() * 500) + 100,
              lengthInMillimeter: Math.floor(Math.random() * 500) + 100,
              widthInMillimeter: Math.floor(Math.random() * 500) + 100,
              weightInGram: Math.floor(Math.random() * 5000) + 500
            },
            trackingData: {
              trackingId: `TRK${Math.floor(Math.random() * 1000000)}`,
              carrier: 'FedEx',
              provider: 'FedEx',
              providerTransaction: `PROV${Math.floor(Math.random() * 1000000)}`,
              isReturn: false
            }
          }
        ]
      },
      {
      action: "changeShipmentState",
      shipmentState: "Ready"
      }