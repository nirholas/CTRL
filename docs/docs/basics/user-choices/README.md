# User choices

In LyraOS, users can decide what their choices are on various OS-wide topics on the LyraOS settings application. If you wish to let your app reflect on these choices, consider using the LyraOS `getSetting()` function

Developers can use _**settings codes**_ to access LyraOS settings choices.

{% hint style="info" %}
See a list of default LyraOS settings keys, [here](settings-keys.md).
{% endhint %}

```javascript
await ntx.settings.get("SETTNGS_CODE_HERE") // returns settings value stored in system.
```

