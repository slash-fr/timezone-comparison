class SettingChangedEvent extends Event
{
    /**
     * The setting that has just been updated (one of the values from SettingsEnum).
     * @type {string}
     */
    setting;
    
    /**
     * The new value for the modified setting.
     * @type {any}
     */
    newValue;
    
    /**
     * @param {string} setting The setting that has just been updated (one of the values from SettingsEnum)
     * @param {any} newValue The new value of the modified setting
     */
    constructor(setting, newValue)
    {
        super(SettingChangedEvent.getType());
        this.setting = setting;
        this.newValue = newValue;
        Object.freeze(this);
    }
    
    static getType()
    {
        return "settingchanged";
    }
}
