import { getContext } from '../../../extensions.js';
import { registerSlashCommand } from '../../../slash-commands.js';
import moment from 'moment';

const MODULE_NAME = 'character_stats';
const UPDATE_INTERVAL = 1000;

class CharacterStats {
    constructor() {
        this.shirtSizes = ["Medium", "Large", "X-Large", "XX-Large", "XXX-Large", "XXXX-Large", "XXXXX-Large"];
        this.age = 19;
        this.weight = 170; // lbs
        this.heightInches = 67; // 5'7"
        this.currentCalories = 0;
        this.maxCalories = 1620;
        this.currentDate = moment("2009-06-15");
        this.updateClothingSizes();
    }

    addCalories(calories) {
        this.currentCalories += calories;
    }

    calculateBMI() {
        const bmiValue = (this.weight / (this.heightInches ** 2)) * 703;
        const categories = ["Healthy", "Overweight", "Chubby", "Obese", "Super Obese", "Hyper Obese"];
        const thresholds = [18.5, 25, 30, 35, 40, 45];
        for (let i = 0; i < thresholds.length; i++) {
            if (bmiValue < thresholds[i]) {
                return `${bmiValue.toFixed(1)} (${categories[i]})`;
            }
        }
        return `${bmiValue.toFixed(1)} (${categories[categories.length - 1]})`;
    }

    calculateBMR() {
        return 655 + (4.35 * this.weight) + (4.7 * this.heightInches) - (4.7 * this.age);
    }

    calculateFullness() {
        const fullnessPercentage = (this.currentCalories / this.maxCalories) * 100;
        if (fullnessPercentage <= 20) return "Starving";
        else if (fullnessPercentage <= 40) return "Hungry";
        else if (fullnessPercentage <= 60) return "Content";
        else if (fullnessPercentage <= 80) return "Satiated";
        else if (fullnessPercentage <= 100) return "Stuffed";
        else return "Overfed";
    }

    endDay() {
        this.currentDate.add(1, 'days');
        if (this.currentDate.month() === 7 && this.currentDate.date() === 16) {
            this.age++;
        }
        const excessCalories = this.currentCalories - this.calculateBMR();
        if (excessCalories > 500) {
            this.weight += Math.floor(excessCalories / 500);
        }
        this.currentCalories = 0;
        this.updateClothingSizes();
        this.maxCalories = this.calculateBMR();
    }

    formattedDate() {
        return this.currentDate.format("MMMM DD, YYYY");
    }

    updateClothingSizes() {
        const weightDiff = this.weight - 170;
        const shirtIndex = Math.max(0, Math.min(this.shirtSizes.length - 1, Math.floor(weightDiff / 30)));
        this.shirtSize = this.shirtSizes[shirtIndex];
        this.shirtFit = this.calculateFit(weightDiff, 30);

        this.pantSize = 14 + (Math.max(0, Math.floor(weightDiff / 15)) * 2);
        this.pantFit = this.calculateFit(weightDiff, 15);
    }

    calculateFit(weightDiff, divider) {
        const remainder = weightDiff % divider;
        if (remainder <= 5) return "Loose Fit";
        else if (remainder <= 10) return "Standard Fit";
        else return "Tight Fit";
    }

    resetStats() {
        this.age = 19;
        this.weight = 170;
        this.heightInches = 67;
        this.currentCalories = 0;
        this.maxCalories = 1620;
        this.currentDate = moment("2009-06-15");
        this.updateClothingSizes();
    }

    setWeight(newWeight) {
        this.weight = newWeight;
        this.updateClothingSizes();
        this.maxCalories = this.calculateBMR();
    }

    setAge(newAge) {
        this.age = newAge;
        this.maxCalories = this.calculateBMR();
    }

    setCalories(newCalories) {
        this.currentCalories = newCalories;
    }

    setDate(newDate) {
        this.currentDate = moment(newDate);
    }
    updateUI() {
        const bmi = this.calculateBMI();
        const fullness = this.calculateFullness();
        const currentDateFormatted = this.formattedDate();
        $('#character_stats_panel').html(`
            <p>Age: ${this.age}</p>
            <p>Weight: ${this.weight} lbs</p>
            <p>Height: ${this.heightInches} inches</p>
            <p>BMI: ${bmi}</p>
            <p>Fullness: ${fullness}</p>
            <p>Calories: ${this.currentCalories} / ${this.maxCalories}</p>
            <p>Date: ${currentDateFormatted}</p>
            <p>Shirt Size: ${this.shirtSize} (${this.shirtFit})</p>
            <p>Pant Size: ${this.pantSize} (${this.pantFit})</p>
        `);
    }
}

const characterStats = new CharacterStats();

function addCharacterStatsPanel() {
    const panelHtml = `
    <div id="character_stats_panel" class="character-stats-panel">
        <!-- Stats will be displayed here -->
    </div>`;
    $(document.body).append(panelHtml);
    $('#character_stats_panel').hide();

    // Adding the toggle button
    const buttonHtml = `
    <div class="toggle-stats-button">Toggle Stats</div>`;
    $(document.body).append(buttonHtml);

    // Event listener for the toggle button
    $('.toggle-stats-button').on('click', function() {
        $('#character_stats_panel').toggle();
    });
}

function toggleCharacterStatsPanel() {
    $('#character_stats_panel').toggle();
}

function handleUserInput(input) {
    const parsedInput = parseInput(input);
    if (parsedInput.command) {
        executeCommand(parsedInput.command, parsedInput.value);
    }
}

function parseInput(input) {
    const commandRegex = /(==END_DAY==|weight==\d+|age==\d+|calories==\d+|date==\d{4}-\d{2}-\d{2})/;
    const match = input.match(commandRegex);
    if (match) {
        const [command, value] = match[0].split('==');
        return { command, value: parseInt(value) || value };
    }
    return { command: null, value: null };
}

function executeCommand(command, value) {
    switch (command) {
        case 'END_DAY':
            characterStats.endDay();
            break;
        case 'weight':
            characterStats.setWeight(value);
            break;
        case 'age':
            characterStats.setAge(value);
            break;
        case 'calories':
            characterStats.setCalories(value);
            break;
        case 'date':
            characterStats.setDate(value);
            break;
        default:
            console.log('Unknown command:', command);
    }
    characterStats.updateUI();
}

async function moduleWorker() {
    const context = getContext();
    if (context.onlineStatus !== 'no_connection') {
        $('#character_stats_panel').show();
        characterStats.updateUI();
    } else {
        $('#character_stats_panel').hide();
    }
}

jQuery(function () {
    addCharacterStatsPanel();
    moduleWorker();
    setInterval(moduleWorker, UPDATE_INTERVAL);

    registerSlashCommand('stats', (_, value) => handleUserInput(value), ['stats'], 'Use commands like /stats weight==200 to update character stats', false, true);

    // Optional: Bind a key or button to toggle the stats panel
    $(document).on('keydown', (e) => {
        if (e.key === 's') { // Press 's' to toggle stats panel
            toggleCharacterStatsPanel();
        }
    });
});
