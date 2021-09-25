## Events supported
- Added pages  **`PageEvent.added[]`**
- Removed pages  **`PageEvent.deleted[]`**
- Edited page properties  **`PageEvent.edited`**

## Event body expected for drivers
```json
{
    "created_at": "2021-09-25T01:19:58.880Z",
    "updated_at": "2021-09-25T01:19:58.880Z",
    "page_id": "42ecf5abe6e24772827a79811d404de6",
    "changes": {
        "changed": [
            {
                "name": "My inspiring task",
                "changed": [
                    {
                        "property": "Card Status",
                        "type": "formula",
                        "changes": {
                            "edited": {
                                "old": {
                                    "value": "In progress!"
                                },
                                "new": {
                                    "value": "Needs reviewier!"
                                }
                            }
                        }
                    },
                ]
            }
        ]
    },
    "workspace": "Acme INC"
}
```


