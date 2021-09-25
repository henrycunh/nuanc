## Events supported
- Added pages  **`PageEvent.added[]`**
- Removed pages  **`PageEvent.deleted[]`**
- Edited page properties  **`PageEvent.edited`**

## Event body expected for drivers
```json
{
    "created_at": datetime,
    "updated_at": datetime,
    "page_id": string,
    "changes": json,
    "workspace": string
}
```


